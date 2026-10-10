import asyncio

import pytest

from app.modules.connections.models import (
    ChatMessage,
    CloseReason,
    Connection,
    MessageKind,
    SystemEvent,
)
from app.modules.connections.service import ConnectionService
from app.modules.connections.timeline import post_message
from tests.factories import make_user


async def connect(a, b):
    service = ConnectionService()
    pending = await service.request(a, b.oid)
    return await service.accept(b, pending.oid)


def send(api, bearer, user, room, client_id):
    return api.post(
        f"/v1/connections/{room.oid}/messages",
        json={"clientId": client_id, "body": "đồng thời"},
        headers=bearer(user),
    )


@pytest.mark.asyncio
async def test_both_sides_sending_at_once_all_succeed(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)

    results = await asyncio.gather(
        *(send(api, bearer, a, room, f"client-a-{i}") for i in range(10)),
        *(send(api, bearer, b, room, f"client-b-{i}") for i in range(10)),
    )

    assert [r.status_code for r in results] == [200] * 20
    fresh = await Connection.get(room.oid)
    assert fresh is not None
    texts = await ChatMessage.find({"kind": MessageKind.TEXT.value}).count()
    assert texts == 20
    # 1 "connected" + 10 from b, all unread for a; 10 from a unread for b.
    assert fresh.member(a.oid).unread_count == 11
    assert fresh.member(b.oid).unread_count == 10


@pytest.mark.asyncio
async def test_accept_while_peer_sends_records_the_grant(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    await api.post(f"/v1/connections/{room.oid}/reveals/photos", headers=bearer(a))

    accept = api.post(
        f"/v1/connections/{room.oid}/reveals/photos/accept", headers=bearer(b)
    )
    results = await asyncio.gather(
        accept, *(send(api, bearer, a, room, f"client-x-{i}") for i in range(5))
    )

    assert [r.status_code for r in results] == [200] * 6
    granted = await ChatMessage.find({"event": SystemEvent.REVEAL_GRANTED.value}).count()
    assert granted == 1


@pytest.mark.asyncio
async def test_posting_into_a_closed_room_stores_nothing(redis):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    await ConnectionService().close_between(a.oid, b.oid, CloseReason.BLOCK)

    message = await post_message(
        room, actor_id=b.oid, kind=MessageKind.TEXT, body="sau khi chặn"
    )

    assert message is None
    assert await ChatMessage.find({"kind": MessageKind.TEXT.value}).count() == 0
    fresh = await Connection.get(room.oid)
    assert fresh is not None
    assert fresh.member(a.oid).unread_count == 1  # only "connected"
