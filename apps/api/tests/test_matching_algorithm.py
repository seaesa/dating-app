from datetime import UTC, datetime, timedelta

from beanie import PydanticObjectId

from app.modules.matching.scorer import (
    calculate_match_score,
    score_activity,
    score_distance,
    score_intent,
    score_interests,
    score_lifestyle,
)
from app.modules.users.criteria import MatchCriteria
from app.modules.users.models import User
from app.modules.users.schemas import (
    MatchingProfile,
    PrivateIdentity,
    ProfileAttributes,
    PublicProfile,
    UserStatus,
)


def test_matching_algorithm_case_study_specification() -> None:
    """Validate exact Case Study from docs/MATCHING_ALGORITHM.md.md.

    User A (Male, 26):
    - Intent: LONG_TERM ('serious')
    - Habits: smoking='never', drinking='social', pets='cat'
    - Interests: [cafe, backpacking, movies, running, tech]

    User B (Female, 24, candidate 4km away):
    - Intent: NOT_SURE ('unsure')
    - Habits: smoking='never', drinking='never', pets='cat'
    - Interests: [cafe, backpacking, cooking, books]
    - Online: 3 hours ago (within 24h)
    - Bio: full (>80 chars)
    """
    now = datetime.now(UTC)
    current_year = now.year

    # 1. Intent score: serious vs unsure -> 15 / 25
    s_intent = score_intent("serious", "unsure")
    assert s_intent == 15.0

    # 2. Lifestyle score:
    # - Smoking: never vs never -> +5
    # - Drinking: social vs never -> +3
    # - Pets: cat vs cat -> +5
    # - Religion & Kids: unset -> +2
    # Total lifestyle: 15 / 25
    attrs_a = ProfileAttributes(
        intent="serious",
        smoking="never",
        drinking="social",
        pets="cat",
    )
    attrs_b = ProfileAttributes(
        intent="unsure",
        smoking="never",
        drinking="never",
        pets="cat",
    )
    s_lifestyle = score_lifestyle(attrs_a, attrs_b)
    assert s_lifestyle == 18.0

    # 3. Interests score:
    # Common: cafe, backpacking (2 tags), min_len: 4
    # Overlap ratio: 2/4 = 0.5 -> 7.5
    # Count scaling: (2/3) * 10 = 6.67
    # Total: 7.5 + 6.67 = 14.17
    interests_a = ["cafe", "backpacking", "movies", "running", "tech"]
    interests_b = ["cafe", "backpacking", "cooking", "books"]
    s_interests = score_interests(interests_a, interests_b)
    assert round(s_interests, 2) == 14.17

    # 4. Distance score:
    # 4km with max_distance_km=10 -> 15.0 * (1.0 - 4/10) = 9.0 / 15
    s_distance = score_distance(4.0, max_distance_km=10.0)
    assert s_distance == 9.0

    # 5. Activity score:
    # Candidate B online 3h ago (<24h -> 4.0đ)
    # Bio > 80 chars (2.0đ), at least 1 photo media id (2.0đ) -> 8.0 / 10
    user_b = User(
        phone="+84999999999",
        status=UserStatus.ACTIVE,
        last_active_at=now - timedelta(hours=3),
        public=PublicProfile(
            display_name="Mai Chi",
            gender="female",
            birth_year=current_year - 24,
            city="TP. Hồ Chí Minh",
            bio="Yêu thích những buổi chiều cà phê một mình và đọc sách. Tìm kiếm một người có thể cùng chia sẻ những câu chuyện không đầu không cuối và cùng nhau khám phá những quán ăn ngon ở Sài Gòn.",
            interests=interests_b,
            attributes=attrs_b,
        ),
        private=PrivateIdentity(
            photo_media_ids=[PydanticObjectId()],
        ),
    )
    s_activity = score_activity(user_b, now=now)
    assert s_activity == 8.0

    # 6. Overall Match Score Calculation
    user_a = User(
        phone="+84988888888",
        status=UserStatus.ACTIVE,
        last_active_at=now - timedelta(minutes=10),
        public=PublicProfile(
            display_name="Quốc Bảo",
            gender="male",
            birth_year=current_year - 26,
            city="TP. Hồ Chí Minh",
            interests=interests_a,
            attributes=attrs_a,
        ),
        matching=MatchingProfile(
            criteria=MatchCriteria(
                genders=["female"],
                age_min=22,
                age_max=28,
                max_distance_km=10,
            )
        ),
    )

    breakdown = calculate_match_score(user_a, user_b, distance_km=4.0, now=now)

    assert round(breakdown.total_score, 2) == 64.17
    assert breakdown.intent_score == 15.0
    assert breakdown.lifestyle_score == 18.0
    assert round(breakdown.interests_score, 2) == 14.17
    assert breakdown.distance_score == 9.0
    assert breakdown.activity_score == 8.0


def test_dealbreaker_lifestyle_penalties() -> None:
    """Conflicting lifestyle habits (smoking never vs often, kids yes vs no)

    receive 0 points for those dimensions.
    """
    attrs_a = ProfileAttributes(
        smoking="never",
        drinking="never",
        wants_children="no",
    )
    attrs_b = ProfileAttributes(
        smoking="often",
        drinking="often",
        wants_children="yes",
    )

    score = score_lifestyle(attrs_a, attrs_b)
    # Smoking: 0, Drinking: 0, Kids: 0, Pets (unset): 3, Religion (unset): 1
    # Education (unset): 1.5, Industry (unset): 1.5 -> 7.0
    assert score == 7.0
