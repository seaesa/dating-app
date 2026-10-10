import asyncio
import json

import pytest

from app.modules.connections.models import ChatMessage, SystemEvent
from app.modules.connections.service import ConnectionService
from tests.factories import make_user


async def connect(a, b):
    service = ConnectionService()
    pending = await service.request(a, b.oid)
    return await service.accept(b, pending.oid)


def path(room, kind, action=""):
    return f"/v1/connections/{room.oid}/reveals/{kind}{action}"


async def events_in(room):
    messages = await ChatMessage.find({"connection_id": room.oid}).sort("_id").to_list()
    return [m.event for m in messages]


@pytest.mark.asyncio
async def test_request_then_accept_grants_both(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)

    asked = await api.post(path(room, "photos"), headers=bearer(a))
    assert asked.status_code == 200
    assert asked.json()["reveals"]["photos"] == {
        "state": "requested",
        "requestedBy": str(a.oid),
    }

    granted = await api.post(path(room, "photos", "/accept"), headers=bearer(b))
    assert granted.json()["reveals"]["photos"]["state"] == "granted"
    assert len(granted.json()["peer"]["identity"]["photoUrls"]) == 2
    assert await events_in(room) == [
        SystemEvent.CONNECTED,
        SystemEvent.REVEAL_REQUESTED,
        SystemEvent.REVEAL_GRANTED,
    ]


@pytest.mark.asyncio
async def test_decline_then_request_again_immediately(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    await api.post(path(room, "phone"), headers=bearer(a))
    declined = await api.post(path(room, "phone", "/decline"), headers=bearer(b))
    assert declined.json()["reveals"]["phone"] == {"state": "none", "requestedBy": None}
    again = await api.post(path(room, "phone"), headers=bearer(a))
    assert again.json()["reveals"]["phone"]["state"] == "requested"


@pytest.mark.asyncio
async def test_both_requesting_grants(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    await api.post(path(room, "phone"), headers=bearer(a))
    both = await api.post(path(room, "phone"), headers=bearer(b))
    assert both.json()["reveals"]["phone"]["state"] == "granted"
    assert both.json()["peer"]["phone"] == "+84910000001"


@pytest.mark.asyncio
async def test_invalid_transitions_conflict(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    nothing = await api.post(path(room, "photos", "/accept"), headers=bearer(b))
    assert nothing.status_code == 409
    await api.post(path(room, "photos"), headers=bearer(a))
    own = await api.post(path(room, "photos", "/accept"), headers=bearer(a))
    own_decline = await api.post(path(room, "photos", "/decline"), headers=bearer(a))
    assert own.status_code == own_decline.status_code == 409
    # Asking twice is not an error.
    assert (await api.post(path(room, "photos"), headers=bearer(a))).status_code == 200


@pytest.mark.asyncio
async def test_concurrent_accepts_grant_once(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    await api.post(path(room, "photos"), headers=bearer(a))

    results = await asyncio.gather(
        api.post(path(room, "photos", "/accept"), headers=bearer(b)),
        api.post(path(room, "photos", "/accept"), headers=bearer(b)),
    )
    assert sorted(r.status_code for r in results) == [200, 409]
    assert (await events_in(room)).count(SystemEvent.REVEAL_GRANTED) == 1


@pytest.mark.asyncio
async def test_reveal_event_carries_no_private_data(api, bearer, redis):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    pubsub = redis.pubsub(ignore_subscribe_messages=True)
    await pubsub.subscribe(f"u:{a.oid}")

    await api.post(path(room, "phone"), headers=bearer(a))
    await api.post(path(room, "phone", "/accept"), headers=bearer(b))

    raw_events = []
    for _ in range(100):
        event = await pubsub.get_message(timeout=0.05)
        if event:
            raw_events.append(event["data"])
    await pubsub.aclose()
    reveal = [json.loads(e) for e in raw_events if '"reveal.updated"' in e]
    assert reveal[-1]["data"] == {
        "connectionId": str(room.oid),
        "kind": "phone",
        "state": "granted",
        "requestedBy": str(a.oid),
    }
    assert all("+8491000000" not in e and "photoUrls" not in e for e in raw_events)


@pytest.mark.asyncio
async def test_pending_request_is_invisible_to_others(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    c = await make_user("+84910000003")
    room = await connect(a, b)
    await api.post(path(room, "photos"), headers=bearer(a))
    seen_by_c = await api.get(f"/v1/users/{a.oid}", headers=bearer(c))
    assert "reveal" not in seen_by_c.text.lower()
    outsider = await api.post(path(room, "photos", "/accept"), headers=bearer(c))
    assert outsider.status_code == 404
