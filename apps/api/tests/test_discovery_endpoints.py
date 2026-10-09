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


@pytest.mark.asyncio
async def test_discovery_reciprocal_boost(app, auth_headers):
    current_year = datetime.now(UTC).year

    # User A
    user_a = User(
        phone="+84955555551",
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
            )
        ),
    )
    await user_a.insert()

    # User B (Likes User A -> should be boosted)
    user_b = User(
        phone="+84955555552",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="User B (Admirer)",
            gender="female",
            birth_year=current_year - 24,
            city="Hà Nội",
        ),
        matching=MatchingProfile(
            criteria=MatchCriteria(
                genders=["male"],
                age_min=20,
                age_max=30,
            )
        ),
    )
    await user_b.insert()

    # User C (Did not interact)
    user_c = User(
        phone="+84955555553",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="User C (Neutral)",
            gender="female",
            birth_year=current_year - 24,
            city="Hà Nội",
        ),
        matching=MatchingProfile(
            criteria=MatchCriteria(
                genders=["male"],
                age_min=20,
                age_max=30,
            )
        ),
    )
    await user_c.insert()

    # Insert inbound interaction from User B to User A
    interaction = UserInteraction(
        actor_id=user_b.oid,
        target_id=user_a.oid,
        action="like",
    )
    await interaction.insert()

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/v1/discovery", headers=auth_headers(user_a))
        assert resp.status_code == 200
        data = resp.json()

        items = data["items"]
        assert len(items) == 2

        # User B should be boosted and ranked first
        item_b = next(
            it
            for it in items
            if it["user"]["profile"]["displayName"] == "User B (Admirer)"
        )
        item_c = next(
            it
            for it in items
            if it["user"]["profile"]["displayName"] == "User C (Neutral)"
        )

        assert item_b["isBoosted"] is True
        assert item_c["isBoosted"] is False
        assert item_b["matchScore"] > item_c["matchScore"]


@pytest.mark.asyncio
async def test_discovery_cursor_pagination(app, auth_headers):
    current_year = datetime.now(UTC).year

    # User A
    user_a = User(
        phone="+84966666661",
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
            )
        ),
    )
    await user_a.insert()

    # 3 female users matching User A's criteria
    candidates = []
    for i in range(3):
        cand = User(
            phone=f"+8496666666{i + 2}",
            status=UserStatus.ACTIVE,
            public=PublicProfile(
                display_name=f"Candidate {i + 1}",
                gender="female",
                birth_year=current_year - 24,
                city="Hà Nội",
            ),
            matching=MatchingProfile(
                criteria=MatchCriteria(
                    genders=["male"],
                    age_min=20,
                    age_max=30,
                )
            ),
        )
        await cand.insert()
        candidates.append(cand)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Page 1: limit 2
        resp1 = await client.get("/v1/discovery?limit=2", headers=auth_headers(user_a))
        assert resp1.status_code == 200
        data1 = resp1.json()

        assert len(data1["items"]) == 2
        assert data1["nextCursor"] is not None

        page1_ids = {item["user"]["profile"]["displayName"] for item in data1["items"]}

        # Page 2: query with nextCursor
        resp2 = await client.get(
            f"/v1/discovery?limit=2&cursor={data1['nextCursor']}",
            headers=auth_headers(user_a),
        )
        assert resp2.status_code == 200
        data2 = resp2.json()

        assert len(data2["items"]) == 1
        assert data2["nextCursor"] is None

        page2_ids = {item["user"]["profile"]["displayName"] for item in data2["items"]}

        # Check no overlap between page 1 and page 2
        assert page1_ids.isdisjoint(page2_ids)
