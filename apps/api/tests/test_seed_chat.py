import pytest

from app.modules.connections.models import ChatMessage, Connection, MessageKind
from app.modules.users.models import User
from app.modules.users.schemas import UserStatus
from app.seed import seed_chat


@pytest.mark.asyncio
async def test_seed_is_repeatable(redis, settings):
    uploaded: list[str] = []

    async def fake_upload(key: str, data: bytes) -> None:
        assert data.startswith(b"\x89PNG")
        uploaded.append(key)

    phones = ("+84900000001", "+84900000002")
    first = await seed_chat(settings, *phones, messages=4, upload=fake_upload)
    second = await seed_chat(settings, *phones, messages=4, upload=fake_upload)

    assert first == second
    assert await Connection.find_all().count() == 1
    users = await User.find_all().to_list()
    assert {u.status for u in users} == {UserStatus.ACTIVE}
    assert all(len(u.private.photo_media_ids) == 2 for u in users)
    assert len(uploaded) == 4
    texts = await ChatMessage.find({"kind": MessageKind.TEXT.value}).count()
    assert texts == 4
