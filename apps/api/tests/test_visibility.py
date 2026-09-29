from typing import Any

import pytest

from app.modules.users.models import User
from app.modules.users.schemas import (
    GeoPoint,
    PrivateIdentity,
    PublicProfile,
    PublicProfileRead,
    UserStatus,
)
from app.modules.users.visibility import (
    PRIVATE_FIELD_NAMES,
    RevealScope,
    project_user,
    resolve_scope,
)


async def _user(nickname: str, phone: str) -> User:
    """Persist the user.

    project_user reads `target.oid`, which is the id without Beanie's Optional
    — an unsaved document has none. Building these in memory meant the
    projection silently received a freshly invented ObjectId, so every
    assertion about an id compared against a fabricated value.
    """
    return await User(
        phone=phone,
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            nickname=nickname,
            birth_year=2000,
            city="Ho Chi Minh",
            bio="hi",
            interests=["coffee"],
        ),
        private=PrivateIdentity(
            real_name="Nguyen Van A",
            socials={"instagram": "realhandle"},
            location=GeoPoint(coordinates=[106.7, 10.78]),
        ),
    ).insert()


def _is_empty(value: Any) -> bool:
    return value is None or value == "" or value == [] or value == {}


def _all_keys(value: Any, found: set[str] | None = None) -> set[str]:
    """Every key at every depth that actually carries a value.

    Keys holding null or an empty container are skipped on purpose: UserRead
    declares `identity` and `phone` as nullable so the generated TypeScript has
    ONE user type and the client branches on null rather than on two shapes.
    A null placeholder is that contract; a private field name carrying real
    data is the leak this guard exists to catch.
    """
    found = found if found is not None else set()
    if isinstance(value, dict):
        for key, nested in value.items():
            if not _is_empty(nested):
                found.add(key)
            _all_keys(nested, found)
    elif isinstance(value, list):
        for item in value:
            _all_keys(item, found)
    return found


def _all_values(value: Any, found: list[Any] | None = None) -> list[Any]:
    found = found if found is not None else []
    if isinstance(value, dict):
        for nested in value.values():
            _all_values(nested, found)
    elif isinstance(value, list):
        for item in value:
            _all_values(item, found)
    else:
        found.append(value)
    return found


@pytest.mark.asyncio
async def test_public_scope_exposes_no_private_key(clean_db: None) -> None:
    """The regression guard.

    Compares key sets rather than asserting field by field, so adding a field
    to PrivateIdentity and forgetting to hide it fails here instead of
    reaching production.
    """
    target = await _user("mai", "+84900000001")

    body = project_user(target, RevealScope.PUBLIC).model_dump(mode="json")

    leaked = _all_keys(body) & PRIVATE_FIELD_NAMES
    assert not leaked, f"private field names reached a public response: {leaked}"


@pytest.mark.asyncio
async def test_public_scope_exposes_no_private_value(clean_db: None) -> None:
    """Keys could be renamed while the values still leak."""
    target = await _user("mai", "+84900000001")

    values = _all_values(project_user(target, RevealScope.PUBLIC).model_dump(mode="json"))

    assert "Nguyen Van A" not in values
    assert "realhandle" not in values
    assert "+84900000001" not in values
    assert 106.7 not in values


def test_the_public_read_schema_exposes_only_approved_fields() -> None:
    """The guard that can actually fail.

    PRIVATE_FIELD_NAMES is DERIVED from PrivateIdentity, so asserting that it
    covers PrivateIdentity's fields is a tautology — adding a field widens both
    sides and the assertion can never fail. Verified by injecting a field and
    watching that version of this test still pass.

    The real risk is not PrivateIdentity growing: project_user builds
    PublicProfileRead from an explicit allow-list, so new private fields are
    safe by construction. The risk is someone widening the PUBLIC schema. This
    pins it: adding a field to PublicProfileRead fails here until a human
    confirms it belongs in a stranger's view.
    """
    assert set(PublicProfileRead.model_fields) == {
        "nickname",
        "age",
        "city",
        "bio",
        "interests",
        "avatar_url",
    }


def test_no_module_outside_visibility_builds_a_user_response() -> None:
    """`project_user` must be the only way a User becomes a response.

    A route that assembles UserRead itself bypasses the scope decision
    entirely, which is how a private field reaches a stranger even though the
    projection is correct.
    """
    import pathlib
    import re

    # Construction only. `class UserRead(BaseSchema)` is the definition, and
    # `-> UserRead:` is a return annotation; neither bypasses anything.
    # Construction and validation both bypass the gate. BaseSchema sets
    # from_attributes=True, so UserRead.model_validate(user) is a plausible
    # spelling that a plain `UserRead(` pattern would miss entirely.
    construction = re.compile(r"(?<!class )\bUserRead\(|\bUserRead\.model_")

    src = pathlib.Path(__file__).resolve().parents[1] / "src" / "app"
    offenders = sorted(
        path.relative_to(src).as_posix()
        for path in src.rglob("*.py")
        if path.name != "visibility.py" and construction.search(path.read_text())
    )

    assert offenders == [], f"these build UserRead directly: {offenders}"


@pytest.mark.asyncio
async def test_self_scope_sees_everything(clean_db: None) -> None:
    target = await _user("mai", "+84900000001")

    body = project_user(target, RevealScope.SELF).model_dump(mode="json")

    assert body["identity"]["realName"] == "Nguyen Van A"
    assert body["phone"] == "+84900000001"


@pytest.mark.asyncio
async def test_revealed_scope_sees_everything(clean_db: None) -> None:
    target = await _user("mai", "+84900000001")

    body = project_user(target, RevealScope.REVEALED).model_dump(mode="json")

    assert body["identity"]["realName"] == "Nguyen Van A"


@pytest.mark.asyncio
async def test_public_scope_still_returns_the_persona(clean_db: None) -> None:
    target = await _user("mai", "+84900000001")

    body = project_user(target, RevealScope.PUBLIC).model_dump(mode="json")

    assert body["profile"]["nickname"] == "mai"
    assert body["profile"]["city"] == "Ho Chi Minh"
    assert isinstance(body["profile"]["age"], int)


@pytest.mark.asyncio
async def test_age_is_returned_but_birth_year_is_not(clean_db: None) -> None:
    """Only a year is stored, and only an age is returned (spec §5.2)."""
    target = await _user("mai", "+84900000001")

    body = project_user(target, RevealScope.PUBLIC).model_dump(mode="json")

    assert "age" in body["profile"]
    assert "birthYear" not in _all_keys(body)


@pytest.mark.asyncio
async def test_viewer_sees_self_as_self(clean_db: None) -> None:
    me = await _user("mai", "+84900000001")

    assert await resolve_scope(me, me) == RevealScope.SELF


@pytest.mark.asyncio
async def test_a_stranger_gets_public_scope(clean_db: None) -> None:
    me = await _user("mai", "+84900000001")
    other = await _user("lan", "+84900000002")

    assert await resolve_scope(me, other) == RevealScope.PUBLIC


@pytest.mark.asyncio
async def test_an_anonymous_viewer_gets_public_scope(clean_db: None) -> None:
    me = await _user("mai", "+84900000001")

    assert await resolve_scope(me, None) == RevealScope.PUBLIC


@pytest.mark.asyncio
async def test_phone_is_unique(clean_db: None) -> None:
    """The index that makes concurrent first login safe (Review Focus 3)."""
    from pymongo.errors import DuplicateKeyError

    await _user("mai", "+84900000001")

    with pytest.raises(DuplicateKeyError):
        await _user("lan", "+84900000001")


@pytest.mark.asyncio
async def test_the_guard_catches_a_private_field_carrying_real_data(
    clean_db: None,
) -> None:
    """The guard is only worth having if it can fail.

    Feeds a PUBLIC projection a payload that wrongly carries private data and
    asserts the key-set check notices — otherwise relaxing it for null
    placeholders could have silently disarmed it.
    """
    target = await _user("mai", "+84900000001")
    body = project_user(target, RevealScope.PUBLIC).model_dump(mode="json")

    assert not (_all_keys(body) & PRIVATE_FIELD_NAMES)

    body["identity"] = {"realName": "Nguyen Van A"}
    # "identity" is the container, not a private field name; "realName" is.
    assert _all_keys(body) & PRIVATE_FIELD_NAMES == {"realName"}
