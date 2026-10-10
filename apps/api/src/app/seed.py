"""Development data: two onboarded users already connected, so chat can be tried."""

import struct
import uuid
import zlib
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import TypedDict

import httpx
from beanie import PydanticObjectId

from app.core.config import Settings
from app.core.db import close_database, init_database
from app.core.redis import close_redis, init_redis
from app.modules.connections.models import ChatMessage, MessageKind
from app.modules.connections.repository import ConnectionRepository
from app.modules.connections.service import ConnectionService
from app.modules.connections.timeline import post_message
from app.modules.media.models import MediaAsset, MediaKind, MediaStatus
from app.modules.media.storage import MediaStorage
from app.modules.users.criteria import MatchCriteria
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.modules.users.schemas import ProfilePrompt, UserStatus
from app.modules.users.types import Gender

Uploader = Callable[[str, bytes], Awaitable[None]]


class Persona(TypedDict):
    display_name: str
    gender: Gender
    age: int
    bio: str
    interests: list[str]
    colour: tuple[int, int, int]


PERSONAS: list[Persona] = [
    {
        "display_name": "Mai Chi",
        "gender": "female",
        "age": 26,
        "bio": "Thích cà phê sách cuối tuần và những quán nhỏ yên tĩnh ở Quận 1.",
        "interests": ["cafe", "books", "movies"],
        "colour": (255, 111, 97),
    },
    {
        "display_name": "Đức Huy",
        "gender": "male",
        "age": 27,
        "bio": "Kỹ sư thích chụp ảnh film và đi du lịch bụi.",
        "interests": ["cafe", "backpacking", "movies"],
        "colour": (52, 199, 89),
    },
]

SCRIPT = [
    "Chào bạn nhé! Thấy bạn cũng thích cà phê sách ở Quận 1 à?",
    "Chào bạn nha! Đúng rồi, mình hay ghé mấy quán yên tĩnh đường Pasteur.",
    "Hay quá, cuối tuần này mình cũng định đi tìm quán mới nè!",
    "Vậy bạn gợi ý cho mình một quán đi 😊",
    "Có một quán nhỏ trên lầu, nhạc acoustic rất chill.",
    "Nghe hấp dẫn ghê, để mình thử nhé!",
]


def solid_png(rgb: tuple[int, int, int], size: int = 64) -> bytes:
    """A tiny solid-colour PNG, so seeding needs no image files or libraries."""

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    row = b"\x00" + bytes(rgb) * size
    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(row * size))
        + chunk(b"IEND", b"")
    )


def s3_uploader(settings: Settings) -> Uploader:
    storage = MediaStorage(settings)

    async def upload(key: str, data: bytes) -> None:
        url = await storage.presign_put(key, "image/png")
        async with httpx.AsyncClient() as client:
            response = await client.put(
                url, content=data, headers={"Content-Type": "image/png"}
            )
            response.raise_for_status()

    return upload


async def _ensure_user(phone: str, persona: Persona, upload: Uploader) -> User:
    repository = UserRepository()
    user = await repository.find_by_phone(phone) or await repository.create_for_phone(
        phone
    )
    year = datetime.now(UTC).year - persona["age"]
    user.public.display_name = persona["display_name"]
    user.public.gender = persona["gender"]
    user.public.birth_year = year
    user.public.city = "TP. Hồ Chí Minh"
    user.public.bio = persona["bio"]
    user.public.interests = list(persona["interests"])
    user.public.prompts = [
        ProfilePrompt(
            prompt_id="sunday",
            question="Món quà hoàn hảo cho ngày chủ nhật?",
            answer="Một ly latte nóng và một cuốn sách hay.",
        )
    ]
    user.private.date_of_birth = f"{year}-06-15"
    user.matching.criteria = MatchCriteria(
        genders=["male", "female"], age_min=18, age_max=60
    )
    if len(user.private.photo_media_ids) < 2:
        media_ids: list[PydanticObjectId] = []
        for _ in range(2):
            key = f"private/{user.oid}/{uuid.uuid4().hex}.png"
            data = solid_png(persona["colour"])
            await upload(key, data)
            asset = await MediaAsset(
                owner_id=user.oid,
                kind=MediaKind.PRIVATE,
                key=key,
                content_type="image/png",
                size=len(data),
                status=MediaStatus.READY,
            ).insert()
            media_ids.append(asset.oid)
        user.private.photo_media_ids = media_ids
    user.status = UserStatus.ACTIVE
    await user.save()
    return user


async def seed_chat(
    settings: Settings,
    phone_a: str,
    phone_b: str,
    *,
    messages: int = 6,
    upload: Uploader | None = None,
) -> PydanticObjectId:
    uploader = upload or s3_uploader(settings)
    a = await _ensure_user(phone_a, PERSONAS[0], uploader)
    b = await _ensure_user(phone_b, PERSONAS[1], uploader)

    service = ConnectionService()
    connection = await ConnectionRepository().find_between(a.oid, b.oid)
    if connection is None:
        pending = await service.request(a, b.oid)
        connection = await service.accept(b, pending.oid)

    existing = await ChatMessage.find(
        {"connection_id": connection.oid, "kind": MessageKind.TEXT.value}
    ).count()
    for index in range(existing, messages):
        author = a if index % 2 == 0 else b
        await post_message(
            connection,
            actor_id=author.oid,
            kind=MessageKind.TEXT,
            body=SCRIPT[index % len(SCRIPT)],
            client_id=f"seed-{index}",
        )
    return connection.oid


async def run_seed_chat(
    settings: Settings, phone_a: str, phone_b: str, messages: int
) -> None:
    await init_database(settings)
    await init_redis(settings)
    try:
        await MediaStorage(settings).ensure_bucket()
        connection_id = await seed_chat(settings, phone_a, phone_b, messages=messages)
        print(f"seeded connection {connection_id} between {phone_a} and {phone_b}")
    finally:
        await close_redis()
        await close_database()
