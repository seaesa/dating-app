from datetime import UTC, datetime

from app.modules.connections.models import Connection, RevealKind
from app.modules.media.models import MediaAsset, MediaKind, MediaStatus
from app.modules.users.criteria import MatchCriteria
from app.modules.users.models import User
from app.modules.users.schemas import (
    MatchingProfile,
    PrivateIdentity,
    PublicProfile,
    UserStatus,
)


async def make_user(
    phone: str,
    *,
    name: str = "User",
    gender: str = "female",
    photos: int = 2,
    status: UserStatus = UserStatus.ACTIVE,
) -> User:
    """An onboarded user whose private tier is full of things that must not leak."""
    year = datetime.now(UTC).year
    user = User(
        phone=phone,
        status=status,
        public=PublicProfile(
            display_name=name,
            gender=gender,
            birth_year=year - 25,
            city="TP. Hồ Chí Minh",
            interests=["cafe", "books"],
        ),
        private=PrivateIdentity(
            real_name=f"Real {name}",
            date_of_birth=f"{year - 25}-01-01",
            socials={"zalo": f"zalo-{phone}"},
        ),
        matching=MatchingProfile(
            criteria=MatchCriteria(genders=["male", "female"], age_min=18, age_max=60)
        ),
    )
    await user.insert()
    media_ids = []
    for index in range(photos):
        asset = await MediaAsset(
            owner_id=user.oid,
            kind=MediaKind.PRIVATE,
            key=f"private/{user.oid}/{index}.jpg",
            content_type="image/jpeg",
            size=1,
            status=MediaStatus.READY,
        ).insert()
        media_ids.append(asset.oid)
    user.private.photo_media_ids = media_ids
    await user.save()
    return user


async def grant_directly(connection: Connection, kind: RevealKind) -> None:
    """Skip the request/accept dance when a test only cares about the result."""
    await Connection.get_pymongo_collection().update_one(
        {"_id": connection.oid},
        {"$set": {f"reveals.{kind.value}.state": "granted"}},
    )
