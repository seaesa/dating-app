from datetime import UTC, datetime

import httpx
import pytest

from app.core.config import Settings
from app.core.security import create_access_token
from app.main import create_app
from app.modules.interactions.models import UserInteraction
from app.modules.users.criteria import MatchCriteria
from app.modules.users.models import User
from app.modules.users.schemas import (
    MatchingProfile,
    PrivateIdentity,
    ProfileAttributes,
    PublicProfile,
    UserStatus,
)


@pytest.fixture
def app():
    settings = Settings(
        environment="development",
        jwt_secret="test-secret-key-that-is-at-least-32-chars-long",  # noqa: S106
        mongodb_url="mongodb://localhost:27017/terdin_date_test?replicaSet=rs0&directConnection=true",
        redis_url="redis://localhost:6379/1",
    )
    return create_app(settings)


@pytest.fixture
def auth_headers(app):
    def _headers(user: User) -> dict[str, str]:
        settings: Settings = app.state.settings
        token = create_access_token(str(user.oid), settings)
        return {"Authorization": f"Bearer {token}"}

    return _headers


@pytest.mark.asyncio
async def test_strict_rule_zero_discovery_payload(app, auth_headers):
    """Rule Zero: PrivateIdentity (real name, phone, birth date, socials, photos)

    MUST NEVER leak to any user in discovery feed before mutual reveal.
    """
    current_year = datetime.now(UTC).year

    # User A: Observer
    user_a = User(
        phone="+84900000001",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="Observer A",
            gender="male",
            birth_year=current_year - 27,
            city="TP. Hồ Chí Minh",
        ),
        matching=MatchingProfile(
            criteria=MatchCriteria(
                genders=["female"],
                age_min=20,
                age_max=30,
                max_distance_km=50,
            )
        ),
    )
    await user_a.insert()

    # User B: Target Candidate with highly sensitive private identity
    user_b = User(
        phone="+84988887777",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="Secret B",
            gender="female",
            birth_year=current_year - 25,
            city="TP. Hồ Chí Minh",
            bio="Public bio text",
            interests=["cafe", "books"],
            attributes=ProfileAttributes(intent="serious"),
        ),
        private=PrivateIdentity(
            real_name="Nguyễn Thị Bí Mật",
            date_of_birth="2001-05-15",
            socials={"instagram": "@secret_private_ig", "facebook": "fb.com/secret"},
        ),
        matching=MatchingProfile(
            criteria=MatchCriteria(
                genders=["male"],
                age_min=24,
                age_max=32,
                max_distance_km=50,
            )
        ),
    )
    await user_b.insert()

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/v1/discovery", headers=auth_headers(user_a))
        assert resp.status_code == 200
        data = resp.json()

        assert data["totalCount"] >= 1
        # Find candidate B in response
        candidate = next(
            (c for c in data["items"] if c["user"]["id"] == str(user_b.oid)),
            None,
        )
        assert candidate is not None

        user_payload = candidate["user"]

        # 1. Phone number must not be exposed
        assert user_payload.get("phone") is None

        # 2. PrivateIdentity and Account must not be serialized
        assert user_payload.get("identity") is None
        assert user_payload.get("private") is None
        assert user_payload.get("account") is None

        # 3. Sensitive fields must never exist anywhere in candidate JSON
        candidate_json_str = str(candidate).lower()
        assert "nguyễn thị bí mật" not in candidate_json_str
        assert "@secret_private_ig" not in candidate_json_str
        assert "+84988887777" not in candidate_json_str
        assert "2001-05-15" not in candidate_json_str

        # 4. Only public profile fields are visible
        profile = user_payload["profile"]
        assert profile["displayName"] == "Secret B"
        assert profile["bio"] == "Public bio text"
        assert profile["gender"] == "female"
        assert profile["city"] == "TP. Hồ Chí Minh"


@pytest.mark.asyncio
async def test_e2e_interaction_feed_exclusion(app, auth_headers):
    """End-to-end integration test:

    Discovery -> User A passes User B -> User B is permanently excluded from A's feed.
    """
    current_year = datetime.now(UTC).year

    user_a = User(
        phone="+84911112222",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="User A",
            gender="male",
            birth_year=current_year - 26,
            city="Hà Nội",
        ),
        matching=MatchingProfile(
            criteria=MatchCriteria(
                genders=["female"],
                age_min=20,
                age_max=30,
                max_distance_km=50,
            )
        ),
    )
    await user_a.insert()

    user_b = User(
        phone="+84933334444",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="User B",
            gender="female",
            birth_year=current_year - 24,
            city="Hà Nội",
        ),
        matching=MatchingProfile(
            criteria=MatchCriteria(
                genders=["male"],
                age_min=24,
                age_max=32,
                max_distance_km=50,
            )
        ),
    )
    await user_b.insert()

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Step 1: User A sees User B in feed
        resp1 = await client.get("/v1/discovery", headers=auth_headers(user_a))
        assert resp1.status_code == 200
        candidate_ids = [c["user"]["id"] for c in resp1.json()["items"]]
        assert str(user_b.oid) in candidate_ids

        # Step 2: User A passes User B
        interact_resp = await client.post(
            "/v1/interactions",
            json={"targetId": str(user_b.oid), "action": "pass"},
            headers=auth_headers(user_a),
        )
        assert interact_resp.status_code == 200
        assert interact_resp.json()["action"] == "pass"

        # Step 3: Refresh Discovery feed -> User B is excluded
        resp2 = await client.get("/v1/discovery", headers=auth_headers(user_a))
        assert resp2.status_code == 200
        updated_candidate_ids = [c["user"]["id"] for c in resp2.json()["items"]]
        assert str(user_b.oid) not in updated_candidate_ids

        # Step 4: Verify count also decreases
        count_resp = await client.get("/v1/discovery/count", headers=auth_headers(user_a))
        assert count_resp.status_code == 200
        assert count_resp.json()["count"] == 0

        # Step 5: Verify interaction stored in DB
        interaction = await UserInteraction.find_one(
            {"actor_id": user_a.oid, "target_id": user_b.oid}
        )
        assert interaction is not None
        assert interaction.action == "pass"
