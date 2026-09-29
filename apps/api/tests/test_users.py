import json
from typing import Any

import pytest

from app.modules.users.models import User
from app.modules.users.schemas import PublicProfile, UserStatus


async def _make(nickname: str, phone: str, status: UserStatus) -> User:
    return await User(
        phone=phone,
        status=status,
        public=PublicProfile(nickname=nickname, birth_year=2000, city="HCM"),
    ).insert()


@pytest.fixture
async def alice(clean_db: None) -> User:
    return await _make("alice", "+84900000001", UserStatus.ACTIVE)


@pytest.fixture
async def bob(clean_db: None) -> User:
    return await _make("bob", "+84900000002", UserStatus.ACTIVE)


async def test_get_another_user_returns_the_persona_only(
    client: Any, alice: User, bob: User, auth_header: Any
) -> None:
    response = await client.get(f"/v1/users/{bob.id}", headers=auth_header(alice))

    assert response.status_code == 200
    body = response.json()
    assert body["profile"]["nickname"] == "bob"
    assert body["identity"] is None
    assert body["phone"] is None


async def test_get_me_returns_everything(
    client: Any, alice: User, auth_header: Any
) -> None:
    response = await client.get("/v1/users/me", headers=auth_header(alice))

    assert response.status_code == 200
    body = response.json()
    assert body["phone"] == "+84900000001"
    assert body["identity"] is not None


async def test_me_requires_a_token(client: Any, alice: User) -> None:
    response = await client.get("/v1/users/me")

    assert response.status_code == 401
    assert response.json()["type"] == "/errors/unauthorized"


async def test_a_missing_user_is_404(client: Any, alice: User, auth_header: Any) -> None:
    from beanie import PydanticObjectId

    response = await client.get(
        f"/v1/users/{PydanticObjectId()}", headers=auth_header(alice)
    )

    assert response.status_code == 404


async def test_a_malformed_id_is_422_not_500(
    client: Any, alice: User, auth_header: Any
) -> None:
    response = await client.get("/v1/users/not-an-object-id", headers=auth_header(alice))

    assert response.status_code == 422


async def test_a_token_for_a_deleted_account_is_401_not_404(
    client: Any, alice: User, auth_header: Any
) -> None:
    """Token validity must not be an account-existence oracle."""
    header = auth_header(alice)
    await alice.delete()

    response = await client.get("/v1/users/me", headers=header)

    assert response.status_code == 401


async def test_patch_profile_updates_only_what_was_sent(
    client: Any, alice: User, auth_header: Any
) -> None:
    response = await client.patch(
        "/v1/users/me/profile",
        json={"bio": "new bio"},
        headers=auth_header(alice),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["profile"]["bio"] == "new bio"
    assert body["profile"]["nickname"] == "alice", "unsent fields must survive"


async def test_patch_profile_rejects_an_unknown_field(
    client: Any, alice: User, auth_header: Any
) -> None:
    """extra=forbid turns a client typo into a 422 rather than a silent no-op."""
    response = await client.patch(
        "/v1/users/me/profile",
        json={"nicknme": "typo"},
        headers=auth_header(alice),
    )

    assert response.status_code == 422


async def test_patch_profile_validates_length(
    client: Any, alice: User, auth_header: Any
) -> None:
    response = await client.patch(
        "/v1/users/me/profile",
        json={"nickname": "a"},
        headers=auth_header(alice),
    )

    assert response.status_code == 422
    assert "nickname" in response.json()["errors"]


async def test_patch_identity_is_private_to_the_owner(
    client: Any, alice: User, auth_header: Any
) -> None:
    response = await client.patch(
        "/v1/users/me/identity",
        json={"realName": "Alice Nguyen"},
        headers=auth_header(alice),
    )

    assert response.status_code == 200
    assert response.json()["identity"]["realName"] == "Alice Nguyen"


async def test_an_identity_set_by_one_user_stays_hidden_from_another(
    client: Any, alice: User, bob: User, auth_header: Any
) -> None:
    """The invariant, end to end through real HTTP."""
    await client.patch(
        "/v1/users/me/identity",
        json={"realName": "Bob Tran", "socials": {"ig": "bobby"}},
        headers=auth_header(bob),
    )

    body = (await client.get(f"/v1/users/{bob.id}", headers=auth_header(alice))).json()
    serialized = json.dumps(body)

    assert "Bob Tran" not in serialized
    assert "bobby" not in serialized
    assert "+84900000002" not in serialized


async def test_completing_onboarding_activates_the_user(
    client: Any, clean_db: None, auth_header: Any
) -> None:
    pending = await _make("new", "+84900000009", UserStatus.PENDING_ONBOARDING)

    response = await client.patch(
        "/v1/users/me/profile",
        json={"bio": "ready"},
        headers=auth_header(pending),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "active"


async def test_a_suspended_account_is_forbidden(
    client: Any, clean_db: None, auth_header: Any
) -> None:
    suspended = await _make("banned", "+84900000010", UserStatus.SUSPENDED)

    response = await client.get("/v1/users/me", headers=auth_header(suspended))

    assert response.status_code == 403


async def test_an_explicit_null_cannot_destroy_a_required_field(
    client: Any, alice: User, auth_header: Any
) -> None:
    """A PATCH must never be able to brick an account.

    Every field on the update schema is optional so that omitting it means
    "leave it alone". Writing an explicit null straight through would put None
    into a non-nullable field, after which the document no longer parses — and
    the owner cannot repair it, because the dependency that loads them runs
    before any handler.
    """
    response = await client.patch(
        "/v1/users/me/profile",
        json={"nickname": None},
        headers=auth_header(alice),
    )

    assert response.status_code == 422

    # The account must still be readable afterwards.
    after = await client.get("/v1/users/me", headers=auth_header(alice))
    assert after.status_code == 200
    assert after.json()["profile"]["nickname"] == "alice"


async def test_a_suspended_account_cannot_browse_other_users(
    client: Any, clean_db: None, auth_header: Any
) -> None:
    """A ban that covers half the surface is not a ban."""
    from app.modules.users.schemas import UserStatus as _Status

    victim = await _make("victim", "+84900000021", _Status.ACTIVE)
    banned = await _make("banned", "+84900000022", _Status.SUSPENDED)

    response = await client.get(f"/v1/users/{victim.id}", headers=auth_header(banned))

    assert response.status_code == 403


async def test_the_identity_route_has_the_same_null_protection(
    client: Any, alice: User, auth_header: Any
) -> None:
    """Both update paths, not just the one the first test happened to cover.

    photo_media_ids is a required list; real_name is genuinely nullable, so
    clearing it must still work.
    """
    broken = await client.patch(
        "/v1/users/me/identity",
        json={"photoMediaIds": None},
        headers=auth_header(alice),
    )
    assert broken.status_code == 422

    cleared = await client.patch(
        "/v1/users/me/identity",
        json={"realName": None},
        headers=auth_header(alice),
    )
    assert cleared.status_code == 200, "a nullable field must still be clearable"
    assert cleared.json()["identity"]["realName"] is None

    after = await client.get("/v1/users/me", headers=auth_header(alice))
    assert after.status_code == 200
