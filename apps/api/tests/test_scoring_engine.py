from datetime import UTC, datetime, timedelta

import pytest
from beanie import PydanticObjectId

from app.modules.matching.ranking import rank_and_explore
from app.modules.matching.schemas import MatchScoreBreakdown, ScoredCandidate
from app.modules.matching.scorer import (
    calculate_match_score,
    score_activity,
    score_distance,
    score_intent,
    score_interests,
    score_lifestyle,
)
from app.modules.users.models import User
from app.modules.users.schemas import (
    MatchingProfile,
    PrivateIdentity,
    ProfileAttributes,
    PublicProfile,
    SensitiveAttributes,
    UserStatus,
)


def test_score_intent_matrix() -> None:
    assert score_intent("serious", "serious") == 25.0
    assert score_intent("serious", "casual") == 0.0
    assert score_intent("serious", "unsure") == 15.0
    assert score_intent("casual", "casual") == 25.0
    assert score_intent("casual", "unsure") == 20.0
    assert score_intent("friends", "friends") == 25.0
    assert score_intent("unsure", "unsure") == 25.0
    assert score_intent(None, "serious") == 10.0
    assert score_intent("unknown_val", "serious") == 10.0


def test_score_lifestyle_case_study() -> None:
    attrs_a = ProfileAttributes(
        smoking="never",
        drinking="social",
        pets="cat",
    )
    attrs_b = ProfileAttributes(
        smoking="never",
        drinking="never",
        pets="cat",
    )
    # Smoking: 5.0, Drinking: 3.0, Pets: 5.0, Religion (None): 1.0, Kids (None): 1.0 -> 15.0
    score = score_lifestyle(attrs_a, attrs_b)
    assert score == 15.0


def test_score_lifestyle_conflicts() -> None:
    attrs_a = ProfileAttributes(
        smoking="never",
        drinking="never",
        pets="none",
        wants_children="no",
    )
    attrs_b = ProfileAttributes(
        smoking="often",
        drinking="often",
        pets="dog",
        wants_children="yes",
    )
    sensitive_a = SensitiveAttributes(religion="buddhism")
    sensitive_b = SensitiveAttributes(religion="catholic")

    # Smoking (never vs often): 0.0
    # Drinking (never vs often): 0.0
    # Pets (none vs dog): 2.0
    # Religion (buddhism vs catholic): 2.0
    # Kids (no vs yes): 0.0
    # Total = 4.0
    score = score_lifestyle(attrs_a, attrs_b, sensitive_a, sensitive_b)
    assert score == 4.0


def test_score_interests_jaccard() -> None:
    # Exact case study from documentation with catalog valid values
    interests_a = ["cafe", "backpacking", "movies", "running", "tech"]
    interests_b = ["cafe", "backpacking", "cooking", "books"]

    # Intersection: 2, Union: 7 => 2/7 * 25 = 7.1428... -> 7.14
    score = score_interests(interests_a, interests_b)
    assert score == 7.14

    # Empty interests
    assert score_interests(None, None) == 0.0
    assert score_interests([], ["cafe"]) == 0.0

    # 100% overlap
    assert score_interests(["cafe", "gym"], ["cafe", "gym"]) == 25.0


def test_score_distance_tiers() -> None:
    assert score_distance(2.5) == 15.0
    assert score_distance(4.0) == 10.0
    assert score_distance(12.0) == 6.0
    assert score_distance(22.0) == 3.0
    assert score_distance(45.0) == 1.0
    assert score_distance(None) == 5.0


@pytest.mark.asyncio
async def test_score_activity_recency_and_completeness() -> None:
    fixed_now = datetime(2026, 10, 8, 12, 0, 0, tzinfo=UTC)

    candidate = User(
        phone="+84987654321",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="Lan",
            gender="female",
            birth_year=2000,
            city="Hà Nội",
            bio="Xin chào mọi người! Mình là người thích khám phá thế giới, mê cà phê và sách.",
        ),
        private=PrivateIdentity(
            photo_media_ids=[PydanticObjectId()],
        ),
        last_active_at=fixed_now - timedelta(hours=3),
    )

    # 3 hours ago -> <= 24h -> 4.0 pts
    # Bio > 50 chars -> 2.0 pts
    # Photos uploaded -> 2.0 pts
    # Total = 8.0 pts
    assert score_activity(candidate, now=fixed_now) == 8.0


@pytest.mark.asyncio
async def test_case_study_total_score_55_14() -> None:
    fixed_now = datetime(2026, 10, 8, 12, 0, 0, tzinfo=UTC)

    user_a = User(
        phone="+84911111111",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="Huy",
            gender="male",
            birth_year=1998,
            city="Hà Nội",
            bio="Thích chạy bộ và công nghệ",
            interests=["cafe", "backpacking", "movies", "running", "tech"],
            attributes=ProfileAttributes(
                intent="serious",
                smoking="never",
                drinking="social",
                pets="cat",
            ),
        ),
        private=PrivateIdentity(
            photo_media_ids=[PydanticObjectId()],
        ),
        matching=MatchingProfile(sensitive=SensitiveAttributes(religion=None)),
        last_active_at=fixed_now - timedelta(minutes=10),
    )

    candidate_b = User(
        phone="+84922222222",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="Linh",
            gender="female",
            birth_year=2000,
            city="Hà Nội",
            bio="Xin chào mọi người! Mình thích nấu ăn, đọc sách và dành thời gian cho thú cưng.",
            interests=["cafe", "backpacking", "cooking", "books"],
            attributes=ProfileAttributes(
                intent="unsure",
                smoking="never",
                drinking="never",
                pets="cat",
            ),
        ),
        private=PrivateIdentity(
            photo_media_ids=[PydanticObjectId()],
        ),
        matching=MatchingProfile(sensitive=SensitiveAttributes(religion=None)),
        last_active_at=fixed_now - timedelta(hours=3),
    )

    scores = calculate_match_score(user_a, candidate_b, distance_km=4.0, now=fixed_now)

    assert scores.intent_score == 15.0
    assert scores.lifestyle_score == 15.0
    assert scores.interests_score == 7.14
    assert scores.distance_score == 10.0
    assert scores.activity_score == 8.0
    assert scores.total_score == 55.14


@pytest.mark.asyncio
async def test_ranking_epsilon_greedy() -> None:
    fixed_now = datetime(2026, 10, 8, 12, 0, 0, tzinfo=UTC)

    candidates: list[ScoredCandidate] = []

    # 22 older users (> 48h) with high scores
    for i in range(22):
        u = User(
            phone=f"+849000000{i:02d}",
            status=UserStatus.ACTIVE,
            public=PublicProfile(
                display_name=f"OldUser{i}",
                gender="female",
                birth_year=1999,
                city="Hà Nội",
            ),
            created_at=fixed_now - timedelta(days=5),
        )
        await u.insert()
        candidates.append(
            ScoredCandidate(
                user=u,
                distance_km=5.0,
                scores=MatchScoreBreakdown(
                    total_score=80.0 - i,
                    intent_score=20.0,
                    lifestyle_score=20.0,
                    interests_score=20.0,
                    distance_score=10.0,
                    activity_score=10.0,
                ),
            )
        )

    # 3 fresh users (created 6h ago) with lower scores (e.g. 40.0)
    fresh_users: list[User] = []
    for i in range(3):
        u = User(
            phone=f"+849999999{i:02d}",
            status=UserStatus.ACTIVE,
            public=PublicProfile(
                display_name=f"FreshUser{i}",
                gender="female",
                birth_year=2001,
                city="Hà Nội",
            ),
            created_at=fixed_now - timedelta(hours=6),
        )
        await u.insert()
        fresh_users.append(u)
        candidates.append(
            ScoredCandidate(
                user=u,
                distance_km=5.0,
                scores=MatchScoreBreakdown(
                    total_score=40.0 + i,
                    intent_score=10.0,
                    lifestyle_score=10.0,
                    interests_score=10.0,
                    distance_score=5.0,
                    activity_score=5.0,
                ),
            )
        )

    # Rank with page_size=20, epsilon=0.1 (10% = 2 explore slots)
    ranked = rank_and_explore(
        candidates, page_size=20, epsilon=0.1, now=fixed_now, seed=123
    )

    assert len(ranked) == 20

    # Ensure fresh candidates got explored even with lower scores
    ranked_fresh = [c for c in ranked if c.is_new]
    assert len(ranked_fresh) == 2
    assert all(c.user.oid in {fu.oid for fu in fresh_users} for c in ranked_fresh)


@pytest.mark.asyncio
async def test_service_get_ranked_recommendations() -> None:
    from app.modules.matching.service import MatchingService
    from app.modules.users.criteria import MatchCriteria

    service = MatchingService()

    # User A
    user_a = User(
        phone="+84988888888",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="User A",
            gender="male",
            birth_year=1998,
            city="Hà Nội",
            interests=["cafe", "movies"],
            attributes=ProfileAttributes(intent="serious"),
        ),
        matching=MatchingProfile(
            criteria=MatchCriteria(
                genders=["female"],
                age_min=20,
                age_max=30,
                max_distance_km=20,
            )
        ),
    )
    await user_a.insert()

    # Create 3 female candidates in Hà Nội
    for i in range(3):
        cand = User(
            phone=f"+8497777777{i}",
            status=UserStatus.ACTIVE,
            public=PublicProfile(
                display_name=f"Female {i}",
                gender="female",
                birth_year=2000 + i,
                city="Hà Nội",
                interests=["cafe"] if i == 0 else ["gaming"],
                attributes=ProfileAttributes(intent="serious" if i == 0 else "unsure"),
            ),
        )
        await cand.insert()

    results = await service.get_ranked_recommendations(user_a, limit=10)
    assert len(results) == 3
    # First candidate has shared cafe interest and matching serious intent -> highest score
    assert results[0].user.public.display_name == "Female 0"
    assert results[0].scores.total_score > results[1].scores.total_score
