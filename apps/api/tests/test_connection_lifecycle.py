import pytest
from pymongo.errors import DuplicateKeyError

from app.core.errors import ConflictError
from app.modules.connections.models import (
    ChatMessage,
    CloseReason,
    Connection,
    ConnectionStatus,
    MessageKind,
    SystemEvent,
)
from app.modules.connections.repository import ConnectionRepository, ordered_pair
from app.modules.connections.service import ConnectionService
from app.modules.connections.timeline import post_message
from tests.factories import make_user


@pytest.mark.asyncio
async def test_ordered_pair_is_direction_independent():
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    assert ordered_pair(a.oid, b.oid) == ordered_pair(b.oid, a.oid)


@pytest.mark.asyncio
async def test_one_connection_per_pair():
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    low, high = ordered_pair(a.oid, b.oid)
    await Connection(
        user_low=low, user_high=high, participant_ids=[low, high], requested_by=a.oid
    ).insert()
    with pytest.raises(DuplicateKeyError):
        await Connection(
            user_low=low, user_high=high, participant_ids=[low, high], requested_by=b.oid
        ).insert()
    found = await ConnectionRepository().find_between(b.oid, a.oid)
    assert found is not None and found.requested_by == a.oid


async def connect(a, b):
    service = ConnectionService()
    pending = await service.request(a, b.oid)
    return await service.accept(b, pending.oid)


@pytest.mark.asyncio
async def test_accept_opens_room_with_connected_message(redis):
    a = await make_user("+84910000001", name="An")
    b = await make_user("+84910000002", name="Bình")
    opened = await connect(a, b)

    assert opened.status is ConnectionStatus.ACCEPTED
    assert {m.user_id for m in opened.members} == {a.oid, b.oid}
    messages = await ChatMessage.find({"connection_id": opened.oid}).to_list()
    assert [m.event for m in messages] == [SystemEvent.CONNECTED]
    # The acceptor triggered it, so it is unread for the requester only.
    assert opened.member(a.oid).unread_count == 1
    assert opened.member(b.oid).unread_count == 0


@pytest.mark.asyncio
async def test_requester_cannot_accept_own_request(redis):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    pending = await ConnectionService().request(a, b.oid)
    with pytest.raises(ConflictError):
        await ConnectionService().accept(a, pending.oid)


@pytest.mark.asyncio
async def test_second_request_in_either_direction_conflicts(redis):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    await ConnectionService().request(a, b.oid)
    with pytest.raises(ConflictError):
        await ConnectionService().request(b, a.oid)


@pytest.mark.asyncio
async def test_post_message_updates_room_in_one_go(redis):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)

    message = await post_message(
        room, actor_id=a.oid, kind=MessageKind.TEXT, body="x" * 100, client_id="client-1"
    )

    fresh = await Connection.get(room.oid)
    assert fresh is not None
    assert fresh.last_message is not None
    assert fresh.last_message.id == message.id
    assert len(fresh.last_message.preview) == 80
    assert fresh.member(b.oid).unread_count == 1
    assert fresh.member(a.oid).last_read_id == message.id
    stored_ms = message.created_at.replace(
        microsecond=message.created_at.microsecond // 1000 * 1000
    )
    assert fresh.last_activity_at == stored_ms


@pytest.mark.asyncio
async def test_close_between_is_idempotent(redis):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    service = ConnectionService()
    await service.close_between(a.oid, b.oid, CloseReason.UNMATCH)
    await service.close_between(a.oid, b.oid, CloseReason.UNMATCH)
    fresh = await Connection.get(room.oid)
    assert fresh is not None
    assert fresh.status is ConnectionStatus.CLOSED
    assert fresh.close_reason is CloseReason.UNMATCH
    assert fresh.closed_by == a.oid
