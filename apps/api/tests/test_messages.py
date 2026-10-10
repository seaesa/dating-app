import asyncio
import json

import pytest

from app.modules.connections import messaging
from app.modules.connections.models import Connection
from app.modules.connections.service import ConnectionService
from app.modules.notifications.service import PUSH_QUEUE
from tests.factories import make_user


async def connect(a, b):
    service = ConnectionService()
    pending = await service.request(a, b.oid)
    return await service.accept(b, pending.oid)


async def send(api, bearer, user, room, body, client_id):
    return await api.post(
        f"/v1/connections/{room.oid}/messages",
        json={"clientId": client_id, "body": body},
        headers=bearer(user),
    )


@pytest.mark.asyncio
async def test_send_and_page_messages(api, bearer):
    a = await make_user("+84910000001", name="An")
    b = await make_user("+84910000002", name="Bình")
    room = await connect(a, b)
    for index in range(3):
        sent = await send(api, bearer, a, room, f"tin {index}", f"client-{index}")
        assert sent.status_code == 200

    base = f"/v1/connections/{room.oid}/messages"
    page = (await api.get(f"{base}?limit=2", headers=bearer(b))).json()
    assert [m["body"] for m in page["items"]] == ["tin 2", "tin 1"]
    rest = (
        await api.get(f"{base}?limit=2&cursor={page['nextCursor']}", headers=bearer(b))
    ).json()
    assert [m["body"] for m in rest["items"]] == ["tin 0", None]
    assert rest["items"][1]["event"] == "connected"
    assert rest["nextCursor"] is None


@pytest.mark.asyncio
async def test_duplicate_client_id_returns_same_message(api, bearer, monkeypatch):
    monkeypatch.setattr(messaging, "SEND_LIMIT", 1)
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    first = await send(api, bearer, a, room, "xin chào", "client-same")
    again = await send(api, bearer, a, room, "xin chào", "client-same")
    assert first.status_code == again.status_code == 200
    assert first.json()["id"] == again.json()["id"]
    page = (
        await api.get(f"/v1/connections/{room.oid}/messages", headers=bearer(a))
    ).json()
    assert [m["body"] for m in page["items"]].count("xin chào") == 1


@pytest.mark.asyncio
async def test_unread_counts_and_monotonic_read_cursor(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    ids = [
        (await send(api, bearer, a, room, f"m{i}", f"client-{i}")).json()["id"]
        for i in range(3)
    ]
    unread = await api.get("/v1/connections/unread-count", headers=bearer(b))
    assert unread.json() == {"count": 3}

    path = f"/v1/connections/{room.oid}/read"
    newest = await api.post(path, json={"lastReadId": ids[2]}, headers=bearer(b))
    older = await api.post(path, json={"lastReadId": ids[0]}, headers=bearer(b))
    assert newest.status_code == older.status_code == 204

    fresh = await Connection.get(room.oid)
    assert fresh is not None
    assert str(fresh.member(b.oid).last_read_id) == ids[2]
    after = await api.get("/v1/connections/unread-count", headers=bearer(b))
    assert after.json() == {"count": 0}
    detail = (await api.get(f"/v1/connections/{room.oid}", headers=bearer(a))).json()
    assert detail["peerLastReadId"] == ids[2]


@pytest.mark.asyncio
async def test_body_is_trimmed_and_bounded(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    assert (await send(api, bearer, a, room, "   ", "client-blank")).status_code == 422
    too_long = await send(api, bearer, a, room, "x" * 1001, "client-long")
    assert too_long.status_code == 422
    ok = await send(api, bearer, a, room, "  chào  ", "client-trim")
    assert ok.json()["body"] == "chào"


@pytest.mark.asyncio
async def test_outsider_gets_404_everywhere(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    c = await make_user("+84910000003")
    room = await connect(a, b)
    base = f"/v1/connections/{room.oid}"
    assert (await api.get(base, headers=bearer(c))).status_code == 404
    assert (await api.get(f"{base}/messages", headers=bearer(c))).status_code == 404
    assert (await send(api, bearer, c, room, "hi", "client-out")).status_code == 404


@pytest.mark.asyncio
async def test_send_rate_limit(api, bearer, monkeypatch):
    monkeypatch.setattr(messaging, "SEND_LIMIT", 2)
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    codes = [
        (await send(api, bearer, a, room, "x", f"client-rl-{i}")).status_code
        for i in range(3)
    ]
    assert codes == [200, 200, 429]


@pytest.mark.asyncio
async def test_list_orders_by_activity_with_your_turn(api, bearer):
    a = await make_user("+84910000001", name="An")
    b = await make_user("+84910000002", name="Bình")
    c = await make_user("+84910000003", name="Chi")
    room_ab = await connect(a, b)
    await connect(a, c)
    await send(api, bearer, b, room_ab, "đến lượt An", "client-turn")

    items = (await api.get("/v1/connections", headers=bearer(a))).json()["items"]
    assert [i["peer"]["profile"]["displayName"] for i in items] == ["Bình", "Chi"]
    assert items[0]["yourTurn"] is True
    assert items[0]["unreadCount"] == 2  # "connected" + the message
    assert items[0]["lastMessage"]["preview"] == "đến lượt An"
    assert items[0]["peer"].get("identity") is None


@pytest.mark.asyncio
async def test_send_publishes_and_queues_push_without_private_data(api, bearer, redis):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    pubsub = redis.pubsub(ignore_subscribe_messages=True)
    await pubsub.subscribe(f"u:{b.oid}")

    await send(api, bearer, a, room, "bí mật", "client-pub")

    event = None
    for _ in range(50):
        event = await pubsub.get_message(timeout=0.1)
        if event:
            break
        await asyncio.sleep(0)
    await pubsub.aclose()
    assert event is not None
    payload = json.loads(event["data"])
    assert payload["type"] == "message.created"
    assert payload["data"]["message"]["body"] == "bí mật"
    assert "+8491000000" not in event["data"]
    assert "photo" not in event["data"].lower()

    jobs = [json.loads(j) for j in await redis.lrange(PUSH_QUEUE, 0, -1)]
    assert jobs == [
        {"userId": str(b.oid), "connectionId": str(room.oid), "kind": "message"}
    ]
