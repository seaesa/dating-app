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
async def test_get_discovery_feed_and_rule_zero(app, auth_headers):
    current_year = datetime.now(UTC).year

    # Create User A (Male, 26, Hanoi)
    user_a = User(
        phone="+84911111111",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="Huy",
            gender="male",
            birth_year=current_year - 26,
            city="Hà Nội",
            interests=["cafe", "movies"],
            attributes=ProfileAttributes(intent="serious"),
        ),
        matching=MatchingProfile(
            criteria=MatchCriteria(
                genders=["female"],
                age_min=20,
                age_max=30,
                max_distance_km=25,
            )
        ),
    )
    await user_a.insert()

    # Create User B (Female, 24, Hanoi)
    user_b = User(
        phone="+84922222222",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="Linh",
            gender="female",
            birth_year=current_year - 24,
            city="Hà Nội",
            interests=["cafe", "cooking"],
            attributes=ProfileAttributes(intent="serious"),
        ),
        matching=MatchingProfile(
            criteria=MatchCriteria(
                genders=["male"],
                age_min=24,
                age_max=32,
                max_distance_km=25,
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

        assert data["totalCount"] == 1
        candidate = data["items"][0]

        # Verify Candidate data
        assert candidate["user"]["profile"]["displayName"] == "Linh"
        assert candidate["matchScore"] > 0
        # RULE ZERO CHECK: Identity, account, and phone must NOT be exposed in discovery
        assert candidate["user"].get("identity") is None
        assert candidate["user"].get("account") is None
        assert candidate["user"].get("phone") is None

        # Verify discovery count
        count_resp = await client.get("/v1/discovery/count", headers=auth_headers(user_a))
        assert count_resp.status_code == 200
        assert count_resp.json()["count"] == 1


@pytest.mark.asyncio
async def test_interactions_and_mutual_match(app, auth_headers):
    current_year = datetime.now(UTC).year

    user_a = User(
        phone="+84933333333",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="User A",
            gender="male",
            birth_year=current_year - 25,
            city="Hà Nội",
        ),
    )
    await user_a.insert()

    user_b = User(
        phone="+84944444444",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="User B",
            gender="female",
            birth_year=current_year - 23,
            city="Hà Nội",
        ),
    )
    await user_b.insert()

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        # 1. User A likes User B -> matched = False
        resp1 = await client.post(
            "/v1/interactions",
            json={"targetId": str(user_b.oid), "action": "like"},
            headers=auth_headers(user_a),
        )
        assert resp1.status_code == 200
        assert resp1.json()["matched"] is False

        # 2. User B likes User A back -> matched = True (MUTUAL MATCH)
        resp2 = await client.post(
            "/v1/interactions",
            json={"targetId": str(user_a.oid), "action": "like"},
            headers=auth_headers(user_b),
        )
        assert resp2.status_code == 200
        assert resp2.json()["matched"] is True

        # 3. User A cannot interact with self -> 400 Bad Request
        resp_self = await client.post(
            "/v1/interactions",
            json={"targetId": str(user_a.oid), "action": "greet"},
            headers=auth_headers(user_a),
        )
        assert resp_self.status_code == 400

        # 4. Verify interaction stored in database
        count = await UserInteraction.find({"actor_id": user_a.oid}).count()
        assert count == 1
