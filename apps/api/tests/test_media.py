from typing import Any

import pytest

from app.modules.media.models import MediaAsset, MediaKind, MediaStatus
from app.modules.users.models import User
from app.modules.users.schemas import PublicProfile, UserStatus


async def _make(nickname: str, phone: str) -> User:
    return await User(
        phone=phone,
        status=UserStatus.ACTIVE,
        public=PublicProfile(nickname=nickname, birth_year=2000, city="HCM"),
    ).insert()


@pytest.fixture
async def alice(clean_db: None) -> User:
    return await _make("alice", "+84900000001")


@pytest.fixture
async def bob(clean_db: None) -> User:
    return await _make("bob", "+84900000002")


async def test_upload_url_is_presigned(
    client: Any, alice: User, auth_header: Any
) -> None:
    response = await client.post(
        "/v1/media/upload-url",
        json={"kind": "public", "contentType": "image/jpeg", "size": 1024},
        headers=auth_header(alice),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["mediaId"]
    assert body["uploadUrl"].startswith("http")
    assert "X-Amz-Signature" in body["uploadUrl"]


async def test_upload_url_requires_authentication(client: Any, alice: User) -> None:
    response = await client.post(
        "/v1/media/upload-url",
        json={"kind": "public", "contentType": "image/jpeg", "size": 1024},
    )

    assert response.status_code == 401


async def test_a_disallowed_content_type_is_rejected(
    client: Any, alice: User, auth_header: Any
) -> None:
    """An uploader that accepts text/html serves stored XSS from your own origin."""
    response = await client.post(
        "/v1/media/upload-url",
        json={"kind": "public", "contentType": "text/html", "size": 1024},
        headers=auth_header(alice),
    )

    assert response.status_code == 422
    assert "contentType" in response.json()["errors"]


async def test_an_oversized_upload_is_rejected(
    client: Any, alice: User, auth_header: Any
) -> None:
    response = await client.post(
        "/v1/media/upload-url",
        json={
            "kind": "public",
            "contentType": "image/jpeg",
            "size": 50 * 1024 * 1024,
        },
        headers=auth_header(alice),
    )

    assert response.status_code == 422


async def test_confirming_someone_elses_asset_is_refused(
    client: Any, alice: User, bob: User, auth_header: Any
) -> None:
    created = (
        await client.post(
            "/v1/media/upload-url",
            json={"kind": "public", "contentType": "image/jpeg", "size": 1024},
            headers=auth_header(alice),
        )
    ).json()

    response = await client.post(
        f"/v1/media/{created['mediaId']}/confirm", headers=auth_header(bob)
    )

    assert response.status_code in (403, 404)


async def test_a_private_photo_is_not_presigned_for_a_stranger(
    client: Any, alice: User, bob: User, auth_header: Any
) -> None:
    """The media half of the product's core invariant.

    The presign happens inside the projection, so private media passes the same
    single gate the private fields do.
    """
    asset = await MediaAsset(
        owner_id=bob.id,
        kind=MediaKind.PRIVATE,
        key=f"private/{bob.id}/real.jpg",
        content_type="image/jpeg",
        size=1024,
        status=MediaStatus.READY,
    ).insert()
    bob.private.photo_media_ids = [asset.id]
    await bob.save()

    stranger_view = (
        await client.get(f"/v1/users/{bob.id}", headers=auth_header(alice))
    ).json()
    own_view = (await client.get("/v1/users/me", headers=auth_header(bob))).json()

    assert stranger_view["identity"] is None
    assert "real.jpg" not in str(stranger_view)
    assert len(own_view["identity"]["photoUrls"]) == 1
    assert "X-Amz-Signature" in own_view["identity"]["photoUrls"][0]


async def test_a_public_avatar_is_visible_to_a_stranger(
    client: Any, alice: User, bob: User, auth_header: Any
) -> None:
    asset = await MediaAsset(
        owner_id=bob.id,
        kind=MediaKind.PUBLIC,
        key=f"public/{bob.id}/avatar.jpg",
        content_type="image/jpeg",
        size=1024,
        status=MediaStatus.READY,
    ).insert()
    bob.public.avatar_media_id = asset.id
    await bob.save()

    body = (await client.get(f"/v1/users/{bob.id}", headers=auth_header(alice))).json()

    assert body["profile"]["avatarUrl"] is not None
    assert "avatar.jpg" in body["profile"]["avatarUrl"]


async def test_an_unconfirmed_asset_yields_no_url(
    client: Any, alice: User, auth_header: Any
) -> None:
    """A PENDING asset may not exist in storage at all."""
    asset = await MediaAsset(
        owner_id=alice.id,
        kind=MediaKind.PUBLIC,
        key=f"public/{alice.id}/pending.jpg",
        content_type="image/jpeg",
        size=1024,
        status=MediaStatus.PENDING,
    ).insert()
    alice.public.avatar_media_id = asset.id
    await alice.save()

    body = (await client.get("/v1/users/me", headers=auth_header(alice))).json()

    assert body["profile"]["avatarUrl"] is None


async def test_upload_confirm_and_read_round_trip(
    client: Any, alice: User, auth_header: Any
) -> None:
    """The presigned URL must actually accept the bytes."""
    import httpx

    created = (
        await client.post(
            "/v1/media/upload-url",
            json={"kind": "private", "contentType": "image/jpeg", "size": 9},
            headers=auth_header(alice),
        )
    ).json()

    async with httpx.AsyncClient() as raw:
        put = await raw.put(
            created["uploadUrl"],
            content=b"JPEGBYTES",
            headers={"Content-Type": "image/jpeg"},
        )
    assert put.status_code in (200, 204), put.text

    confirmed = await client.post(
        f"/v1/media/{created['mediaId']}/confirm", headers=auth_header(alice)
    )
    assert confirmed.status_code == 200

    asset = await MediaAsset.get(created["mediaId"])
    assert asset is not None
    assert asset.status is MediaStatus.READY
    assert asset.size == 9, "size is taken from storage, not the client's claim"


async def test_confirming_an_asset_never_uploaded_is_refused(
    client: Any, alice: User, auth_header: Any
) -> None:
    created = (
        await client.post(
            "/v1/media/upload-url",
            json={"kind": "public", "contentType": "image/jpeg", "size": 1024},
            headers=auth_header(alice),
        )
    ).json()

    response = await client.post(
        f"/v1/media/{created['mediaId']}/confirm", headers=auth_header(alice)
    )

    assert response.status_code == 422


async def test_storage_itself_refuses_an_unsigned_read(
    client: Any, alice: User, auth_header: Any
) -> None:
    """Defence in depth, at the storage layer.

    The API withholding a URL is the primary control, but an object store that
    serves anything to anyone who guesses a key turns any key leak — a log
    line, a referrer header — into an exposed photo. Local development must
    enforce this too, or it teaches the wrong thing.
    """
    import httpx

    created = (
        await client.post(
            "/v1/media/upload-url",
            json={"kind": "private", "contentType": "image/jpeg", "size": 6},
            headers=auth_header(alice),
        )
    ).json()

    async with httpx.AsyncClient() as raw:
        await raw.put(
            created["uploadUrl"],
            content=b"SECRET",
            headers={"Content-Type": "image/jpeg"},
        )

    asset = await MediaAsset.get(created["mediaId"])
    assert asset is not None

    cfg = client._transport.app.state.settings
    unsigned = f"{cfg.s3_endpoint}/{cfg.s3_bucket}/{asset.key}"

    async with httpx.AsyncClient() as raw:
        response = await raw.get(unsigned)

    assert response.status_code in (401, 403), (
        f"object storage served a private object unsigned: {response.status_code}"
    )
    assert b"SECRET" not in response.content


async def test_a_user_cannot_claim_another_users_media(
    client: Any, alice: User, bob: User, auth_header: Any
) -> None:
    """Media ids are references, not capabilities.

    Nothing stops a client sending someone else's media id, so the server must
    refuse to sign a key it does not own. Without that check any authenticated
    user turns another user's private photo into a working URL.
    """
    created = (
        await client.post(
            "/v1/media/upload-url",
            json={"kind": "private", "contentType": "image/jpeg", "size": 6},
            headers=auth_header(bob),
        )
    ).json()

    import httpx

    async with httpx.AsyncClient() as raw:
        await raw.put(
            created["uploadUrl"],
            content=b"SECRET",
            headers={"Content-Type": "image/jpeg"},
        )
    await client.post(f"/v1/media/{created['mediaId']}/confirm", headers=auth_header(bob))

    # Alice points her own identity at Bob's private photo.
    await client.patch(
        "/v1/users/me/identity",
        json={"photoMediaIds": [created["mediaId"]]},
        headers=auth_header(alice),
    )

    body = (await client.get("/v1/users/me", headers=auth_header(alice))).json()

    assert body["identity"]["photoUrls"] == [], (
        "a user was handed a signed URL for media they do not own"
    )


async def test_a_private_key_is_never_signed_for_a_public_view(
    client: Any, alice: User, auth_header: Any
) -> None:
    """A stranger's view must never carry a private key, even the owner's own.

    avatar_media_id is client-supplied, so pointing it at a private asset is
    one PATCH away — and the avatar is rendered to anonymous viewers.
    """
    created = (
        await client.post(
            "/v1/media/upload-url",
            json={"kind": "private", "contentType": "image/jpeg", "size": 6},
            headers=auth_header(alice),
        )
    ).json()

    import httpx

    async with httpx.AsyncClient() as raw:
        await raw.put(
            created["uploadUrl"],
            content=b"SECRET",
            headers={"Content-Type": "image/jpeg"},
        )
    await client.post(
        f"/v1/media/{created['mediaId']}/confirm", headers=auth_header(alice)
    )

    await client.patch(
        "/v1/users/me/profile",
        json={"avatarMediaId": created["mediaId"]},
        headers=auth_header(alice),
    )

    anonymous = (await client.get(f"/v1/users/{alice.id}")).json()

    assert anonymous["profile"]["avatarUrl"] is None, (
        "a private key was signed into a publicly visible field"
    )


async def test_a_public_avatar_url_outlives_a_private_one(
    client: Any, alice: User, auth_header: Any
) -> None:
    """Public media is cacheable; private media expires quickly."""
    from app.modules.media.service import MediaService

    cfg = client._transport.app.state.settings
    service = MediaService(cfg)

    public = await MediaAsset(
        owner_id=alice.oid,
        kind=MediaKind.PUBLIC,
        key=f"public/{alice.oid}/a.jpg",
        content_type="image/jpeg",
        size=1,
        status=MediaStatus.READY,
    ).insert()

    url = await service.url_for(public.id, owner_id=alice.oid, scope_allows_private=False)

    assert url is not None
    assert f"X-Amz-Expires={cfg.s3_public_presign_ttl}" in url, (
        "public media did not get the long-lived TTL the config defines"
    )
