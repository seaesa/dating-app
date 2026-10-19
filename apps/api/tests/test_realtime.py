import asyncio
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta

import httpx
import jwt
import pytest
from httpx_ws import WebSocketDisconnect, aconnect_ws
from httpx_ws.transport import ASGIWebSocketTransport

from app.modules.connections.service import ConnectionService
from app.modules.realtime.events import is_online
from tests.factories import make_user

URL = "http://test/v1/ws"


@asynccontextmanager
async def ws_client(app):
    """Opened inside the test: the transport's task group must close in-task."""
    transport = ASGIWebSocketTransport(app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


async def connect(a, b):
    service = ConnectionService()
    pending = await service.request(a, b.oid)
    return await service.accept(b, pending.oid)


async def subscribers(redis, user) -> int:
    [(_, count)] = await redis.pubsub_numsub(f"u:{user.oid}")
    return int(count)


async def eventually(check, within=3.0) -> bool:
    deadline = asyncio.get_running_loop().time() + within
    while asyncio.get_running_loop().time() < deadline:
        if await check():
            return True
        await asyncio.sleep(0.02)
    return False


@pytest.mark.asyncio
async def test_socket_receives_message_created(chat_app, redis, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)

    async def subscribed():
        return await subscribers(redis, a) == 1

    async with (
        ws_client(chat_app) as client,
        aconnect_ws(URL, client, headers=bearer(a)) as ws,
    ):
        assert await eventually(subscribed)
        await client.post(
            f"/v1/connections/{room.oid}/messages",
            json={"clientId": "client-ws-1", "body": "Chào"},
            headers=bearer(b),
        )
        event = await asyncio.wait_for(ws.receive_json(), 5)
        assert event["type"] == "message.created"
        assert event["data"]["message"]["body"] == "Chào"


@pytest.mark.asyncio
async def test_invalid_token_is_closed_with_4401(chat_app, redis):
    headers = {"Authorization": "Bearer nope"}
    async with (
        ws_client(chat_app) as client,
        aconnect_ws(URL, client, headers=headers) as ws,
    ):
        with pytest.raises(WebSocketDisconnect) as closed:
            await asyncio.wait_for(ws.receive_text(), 5)
        assert closed.value.code == 4401


@pytest.mark.asyncio
async def test_expired_token_is_closed_with_4401(chat_app, redis, settings, monkeypatch):
    from app.modules.realtime import router as realtime_router

    a = await make_user("+84910000001")
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "sub": str(a.oid),
            "typ": "access",
            "jti": "x",
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(seconds=1)).timestamp()),
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    monkeypatch.setattr(realtime_router, "RECEIVE_TIMEOUT_SECONDS", 0.2)
    headers = {"Authorization": f"Bearer {token}"}
    async with (
        ws_client(chat_app) as client,
        aconnect_ws(URL, client, headers=headers) as ws,
    ):
        with pytest.raises(WebSocketDisconnect) as closed:
            await asyncio.wait_for(ws.receive_text(), 5)
        assert closed.value.code == 4401


@pytest.mark.asyncio
async def test_one_subscription_per_user_and_presence(chat_app, redis, bearer):
    a = await make_user("+84910000001")

    async def count_is(expected):
        async def check():
            return await subscribers(redis, a) == expected

        return check

    async def offline():
        return not await is_online(a.oid)

    async with ws_client(chat_app) as client:
        async with aconnect_ws(URL, client, headers=bearer(a)):
            async with aconnect_ws(URL, client, headers=bearer(a)):
                assert await eventually(await count_is(1))
                assert await is_online(a.oid)
            assert await eventually(await count_is(1))
        assert await eventually(await count_is(0))
        assert await eventually(offline)


@pytest.mark.asyncio
async def test_failed_subscribe_does_not_poison_the_user(redis, monkeypatch):
    from redis.exceptions import RedisError

    from app.modules.realtime.hub import RealtimeHub

    hub = RealtimeHub()
    pubsub = hub._ensure_pubsub()
    real_subscribe = pubsub.subscribe
    calls = 0

    async def flaky(*channels):
        nonlocal calls
        calls += 1
        if calls == 1:
            raise RedisError("blip")
        return await real_subscribe(*channels)

    monkeypatch.setattr(pubsub, "subscribe", flaky)
    with pytest.raises(RedisError):
        await hub.attach("user-1", object())
    await hub.attach("user-1", object())

    assert calls == 2
    [(_, count)] = await redis.pubsub_numsub("u:user-1")
    assert count == 1
    await hub.close()


@pytest.mark.asyncio
async def test_token_query_parameter_authenticates_socket(chat_app, redis, settings):
    from app.core.security import create_access_token

    a = await make_user("+84910000001")
    token = create_access_token(str(a.oid), settings)

    async def subscribed():
        return await subscribers(redis, a) == 1

    url_with_token = f"{URL}?token={token}"
    async with (
        ws_client(chat_app) as client,
        aconnect_ws(url_with_token, client) as ws,
    ):
        assert await eventually(subscribed)
        assert await is_online(a.oid)
        await ws.send_json({"type": "ping"})
