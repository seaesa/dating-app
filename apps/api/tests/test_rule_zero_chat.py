import pytest

from app.modules.connections.models import CloseReason, RevealKind
from app.modules.connections.service import ConnectionService
from tests.factories import grant_directly, make_user


async def connect(a, b):
    service = ConnectionService()
    pending = await service.request(a, b.oid)
    return await service.accept(b, pending.oid)


async def view(api, bearer, viewer, target) -> dict:
    response = await api.get(f"/v1/users/{target.oid}", headers=bearer(viewer))
    assert response.status_code == 200
    return response.json()


def assert_public_only(body: dict) -> None:
    assert body.get("identity") is None
    assert body.get("account") is None
    assert body.get("phone") is None


@pytest.mark.asyncio
async def test_stranger_sees_public_only(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    assert_public_only(await view(api, bearer, a, b))


@pytest.mark.asyncio
async def test_connected_without_grants_is_still_public(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    await connect(a, b)
    assert_public_only(await view(api, bearer, a, b))


@pytest.mark.asyncio
async def test_photo_grant_reveals_photos_and_nothing_else(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    await grant_directly(room, RevealKind.PHOTOS)

    body = await view(api, bearer, a, b)
    assert len(body["identity"]["photoUrls"]) == 2
    assert body["identity"]["realName"] is None
    assert body["identity"]["socials"] == {}
    assert body.get("phone") is None
    assert body.get("account") is None
    # Symmetric: the other side sees the same tier.
    assert len((await view(api, bearer, b, a))["identity"]["photoUrls"]) == 2


@pytest.mark.asyncio
async def test_third_person_never_sees_a_pairs_grants(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    c = await make_user("+84910000003")
    room = await connect(a, b)
    await grant_directly(room, RevealKind.PHOTOS)
    await connect(c, a)  # c is connected to a, with nothing granted

    assert_public_only(await view(api, bearer, c, a))
    assert_public_only(await view(api, bearer, c, b))


@pytest.mark.asyncio
async def test_closing_drops_back_to_public(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    await grant_directly(room, RevealKind.PHOTOS)
    await ConnectionService().close_between(a.oid, b.oid, CloseReason.UNMATCH)
    assert_public_only(await view(api, bearer, a, b))
    assert_public_only(await view(api, bearer, b, a))
