import pytest

from app.modules.media.models import MediaAsset, MediaKind, MediaStatus
from tests.factories import make_user
from tests.test_messages import connect


async def chat_asset(owner, kind=MediaKind.CHAT):
    return await MediaAsset(
        owner_id=owner.oid,
        kind=kind,
        key=f"{kind.value}/{owner.oid}/photo.jpg",
        content_type="image/jpeg",
        size=1,
        status=MediaStatus.READY,
    ).insert()


async def send_image(api, bearer, user, room, media_id, client_id="client-image"):
    return await api.post(
        f"/v1/connections/{room.oid}/messages",
        json={
            "clientId": client_id,
            "image": {"mediaId": str(media_id), "width": 1080, "height": 1440},
        },
        headers=bearer(user),
    )


@pytest.mark.asyncio
async def test_image_reaches_both_members_signed(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    asset = await chat_asset(a)

    sent = await send_image(api, bearer, a, room, asset.oid)
    assert sent.status_code == 200
    message = sent.json()
    assert message["kind"] == "image"
    assert message["senderId"] == str(a.oid)
    assert message["body"] is None
    assert asset.key in message["image"]["url"]
    assert (message["image"]["width"], message["image"]["height"]) == (1080, 1440)

    page = (
        await api.get(f"/v1/connections/{room.oid}/messages", headers=bearer(b))
    ).json()
    assert asset.key in page["items"][0]["image"]["url"]

    rooms = (await api.get("/v1/connections", headers=bearer(b))).json()
    assert rooms["items"][0]["lastMessage"]["kind"] == "image"


@pytest.mark.asyncio
async def test_only_my_own_chat_media_can_be_sent(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    theirs = await chat_asset(b)
    # A private profile photo is not a chat image: sending it would hand the
    # peer a real photo without a reveal.
    profile_photo = a.private.photo_media_ids[0]

    for media_id in (theirs.oid, profile_photo):
        response = await send_image(api, bearer, a, room, media_id)
        assert response.status_code == 422


@pytest.mark.asyncio
async def test_exactly_one_of_body_and_image(api, bearer):
    a = await make_user("+84910000001")
    b = await make_user("+84910000002")
    room = await connect(a, b)
    asset = await chat_asset(a)
    path = f"/v1/connections/{room.oid}/messages"
    image = {"mediaId": str(asset.oid), "width": 10, "height": 10}

    both = {"clientId": "client-both", "body": "hi", "image": image}
    neither = {"clientId": "client-none"}
    for body in (both, neither):
        response = await api.post(path, json=body, headers=bearer(a))
        assert response.status_code == 422
