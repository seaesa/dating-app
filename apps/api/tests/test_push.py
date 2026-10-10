import json

import httpx
import pytest
from beanie import PydanticObjectId

from app.modules.notifications.models import PushDevice
from app.modules.notifications.service import PUSH_QUEUE, PushKind, enqueue_push
from app.modules.notifications.worker import process_batch
from app.modules.realtime.events import mark_connected
from tests.factories import make_user


@pytest.mark.asyncio
async def test_enqueue_for_offline_user_then_throttle(redis):
    user_id, connection_id = PydanticObjectId(), PydanticObjectId()
    assert await enqueue_push(user_id, connection_id, PushKind.MESSAGE) is True
    assert await enqueue_push(user_id, connection_id, PushKind.MESSAGE) is False
    jobs = [json.loads(raw) for raw in await redis.lrange(PUSH_QUEUE, 0, -1)]
    assert jobs == [
        {"userId": str(user_id), "connectionId": str(connection_id), "kind": "message"}
    ]


@pytest.mark.asyncio
async def test_other_kinds_are_throttled_separately(redis):
    user_id, connection_id = PydanticObjectId(), PydanticObjectId()
    assert await enqueue_push(user_id, connection_id, PushKind.MESSAGE)
    assert await enqueue_push(user_id, connection_id, PushKind.REVEAL_REQUEST)


@pytest.mark.asyncio
async def test_no_push_while_a_socket_is_open(redis):
    user_id = PydanticObjectId()
    await mark_connected(str(user_id))
    assert await enqueue_push(user_id, PydanticObjectId(), PushKind.MESSAGE) is False
    assert await redis.llen(PUSH_QUEUE) == 0


@pytest.mark.asyncio
async def test_register_moves_a_token_to_the_new_owner(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    body = {"token": "ExponentPushToken[abc]", "platform": "ios"}
    first = await api.put("/v1/me/push-devices", json=body, headers=bearer(a))
    second = await api.put("/v1/me/push-devices", json=body, headers=bearer(b))
    assert first.status_code == second.status_code == 204
    devices = await PushDevice.find_all().to_list()
    assert [(d.user_id, d.token) for d in devices] == [(b.oid, "ExponentPushToken[abc]")]


@pytest.mark.asyncio
async def test_unregister_removes_only_own_token(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    await api.put(
        "/v1/me/push-devices",
        json={"token": "ExponentPushToken[a]", "platform": "android"},
        headers=bearer(a),
    )
    path = "/v1/me/push-devices/ExponentPushToken%5Ba%5D"
    assert (await api.delete(path, headers=bearer(b))).status_code == 204
    assert await PushDevice.find_all().count() == 1
    assert (await api.delete(path, headers=bearer(a))).status_code == 204
    assert await PushDevice.find_all().count() == 0


@pytest.mark.asyncio
async def test_worker_sends_generic_copy_in_one_batch_and_drops_dead_tokens(
    redis, settings
):
    a = await make_user("+84910000001", name="Mai Chi")
    for token in ("ExponentPushToken[live]", "ExponentPushToken[dead]"):
        await PushDevice(user_id=a.oid, token=token, platform="ios").insert()
    jobs = [
        {"userId": str(a.oid), "connectionId": "c1", "kind": "message"},
        {"userId": str(a.oid), "connectionId": "c2", "kind": "reveal_request"},
    ]
    await redis.lpush(PUSH_QUEUE, json.dumps(jobs[1]))

    calls: list[list[dict]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        sent = json.loads(request.content)
        calls.append(sent)
        tickets = [
            {"status": "error", "details": {"error": "DeviceNotRegistered"}}
            if m["to"].endswith("[dead]")
            else {"status": "ok", "id": "x"}
            for m in sent
        ]
        return httpx.Response(200, json={"data": tickets})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        await process_batch(
            json.dumps(jobs[0]), client, settings.model_copy(update={"app_name": "Brand"})
        )

    assert len(calls) == 1
    assert {m["title"] for m in calls[0]} == {"Brand"}
    assert len(calls[0]) == 4
    bodies = {m["body"] for m in calls[0]}
    assert bodies == {
        "Bạn có tin nhắn mới",
        "Bạn có yêu cầu mới trong cuộc trò chuyện",
    }
    assert all("Mai Chi" not in json.dumps(m) for m in calls[0])
    assert {m["data"]["connectionId"] for m in calls[0]} == {"c1", "c2"}
    remaining = [d.token for d in await PushDevice.find_all().to_list()]
    assert remaining == ["ExponentPushToken[live]"]
    assert await redis.llen(PUSH_QUEUE) == 0


@pytest.mark.asyncio
async def test_worker_logs_ticket_errors_it_cannot_fix(redis, settings):
    from structlog.testing import capture_logs

    a = await make_user("+84910000001")
    device = "ExponentPushToken[x]"
    await PushDevice(user_id=a.oid, token=device, platform="ios").insert()
    job = {"userId": str(a.oid), "connectionId": "c1", "kind": "message"}

    def handler(request: httpx.Request) -> httpx.Response:
        ticket = {"status": "error", "details": {"error": "InvalidCredentials"}}
        return httpx.Response(200, json={"data": [ticket]})

    with capture_logs() as logs:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            await process_batch(json.dumps(job), client, settings)

    errors = [entry for entry in logs if entry["event"] == "push.ticket_error"]
    assert errors and errors[0]["error"] == "InvalidCredentials"
    # Not a dead device: the token stays.
    assert await PushDevice.find_all().count() == 1
