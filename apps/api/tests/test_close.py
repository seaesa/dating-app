import pytest

from app.modules.connections.models import Connection, ConnectionStatus, RevealKind
from app.modules.connections.service import ConnectionService
from app.modules.interactions.models import UserInteraction
from tests.factories import grant_directly, make_user


async def connect(a, b):
    service = ConnectionService()
    pending = await service.request(a, b.oid)
    return await service.accept(b, pending.oid)


async def close(api, bearer, user, room, reason="unmatch"):
    return await api.post(
        f"/v1/connections/{room.oid}/close",
        json={"reason": reason},
        headers=bearer(user),
    )


@pytest.mark.asyncio
async def test_unmatch_hides_room_for_both(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    await grant_directly(room, RevealKind.PHOTOS)

    assert (await close(api, bearer, a, room)).status_code == 204
    for user in (a, b):
        listed = await api.get("/v1/connections", headers=bearer(user))
        assert listed.json()["items"] == []
    seen = await api.get(f"/v1/users/{a.oid}", headers=bearer(b))
    assert seen.json().get("identity") is None


@pytest.mark.asyncio
async def test_closed_room_reads_409(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    await close(api, bearer, a, room)
    base = f"/v1/connections/{room.oid}"
    assert (await api.get(base, headers=bearer(b))).status_code == 409
    assert (await api.get(f"{base}/messages", headers=bearer(b))).status_code == 409
    sent = await api.post(
        f"{base}/messages",
        json={"clientId": "client-closed", "body": "hi"},
        headers=bearer(b),
    )
    assert sent.status_code == 409


@pytest.mark.asyncio
async def test_block_records_interaction(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    await close(api, bearer, a, room, reason="block")
    block = await UserInteraction.find_one({"actor_id": a.oid, "target_id": b.oid})
    assert block is not None
    assert block.action == "block"


@pytest.mark.asyncio
async def test_block_from_discovery_closes_room(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    response = await api.post(
        "/v1/interactions",
        json={"targetId": str(b.oid), "action": "block"},
        headers=bearer(a),
    )
    assert response.status_code == 200
    fresh = await Connection.get(room.oid)
    assert fresh is not None
    assert fresh.status is ConnectionStatus.CLOSED


@pytest.mark.asyncio
async def test_outsider_cannot_close(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    c = await make_user("+84910000003")
    room = await connect(a, b)
    assert (await close(api, bearer, c, room)).status_code == 404
