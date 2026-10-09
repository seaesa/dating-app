from datetime import UTC, datetime
from typing import Final

from app.modules.matching.schemas import MatchScoreBreakdown
from app.modules.users.models import User
from app.modules.users.schemas import ProfileAttributes, SensitiveAttributes

# Normalized dating intent mapping
_INTENT_NORMALIZATION: Final[dict[str, str]] = {
    "serious": "serious",
    "long_term": "serious",
    "casual": "casual",
    "short_term": "casual",
    "friends": "friends",
    "new_friends": "friends",
    "unsure": "unsure",
    "not_sure": "unsure",
}

# Compatibility matrix for dating intents (0 - 25 points)
_INTENT_MATRIX: Final[dict[tuple[str, str], float]] = {
    ("serious", "serious"): 25.0,
    ("serious", "casual"): 0.0,
    ("serious", "friends"): 5.0,
    ("serious", "unsure"): 15.0,
    ("casual", "serious"): 0.0,
    ("casual", "casual"): 25.0,
    ("casual", "friends"): 15.0,
    ("casual", "unsure"): 20.0,
    ("friends", "serious"): 5.0,
    ("friends", "casual"): 15.0,
    ("friends", "friends"): 25.0,
    ("friends", "unsure"): 20.0,
    ("unsure", "serious"): 15.0,
    ("unsure", "casual"): 20.0,
    ("unsure", "friends"): 20.0,
    ("unsure", "unsure"): 25.0,
}


def score_intent(intent_a: str | None, intent_b: str | None) -> float:
    """Calculate dating intent compatibility score (0 - 25 points)."""
    if not intent_a or not intent_b:
        return 10.0

    norm_a = _INTENT_NORMALIZATION.get(intent_a.lower().strip())
    norm_b = _INTENT_NORMALIZATION.get(intent_b.lower().strip())

    if not norm_a or not norm_b:
        return 10.0

    return _INTENT_MATRIX.get((norm_a, norm_b), 10.0)


# Complementary / related industries mapping for bonus points
_RELATED_INDUSTRIES: Final[dict[str, set[str]]] = {
    "it": {"engineering", "design", "business"},
    "engineering": {"it", "design"},
    "design": {"it", "marketing"},
    "business": {"finance", "marketing", "it"},
    "finance": {"business"},
    "marketing": {"business", "design", "hospitality"},
    "education": {"health", "public"},
    "health": {"education"},
    "hospitality": {"marketing", "business"},
}


def score_lifestyle(
    attrs_a: ProfileAttributes,
    attrs_b: ProfileAttributes,
    sensitive_a: SensitiveAttributes | None = None,
    sensitive_b: SensitiveAttributes | None = None,
) -> float:
    """Calculate lifestyle and values compatibility score (0 - 25 points).

    Evaluates sub-dimensions:
    1. Smoking (max 5 pts)
    2. Drinking (max 5 pts)
    3. Pets (max 5 pts)
    4. Religion / Values (max 5 pts)
    5. Kids intent (max 5 pts)
    6. Education (max 2.5 pts)
    7. Industry (max 2.5 pts)

    Total score is normalized and clamped to 25.0 points.
    """
    total = 0.0

    # 1. Smoking (5 pts)
    smk_a = attrs_a.smoking
    smk_b = attrs_b.smoking
    if smk_a is None or smk_b is None:
        total += 3.0
    elif smk_a == smk_b:
        total += 5.0
    elif (smk_a == "never" and smk_b == "often") or (
        smk_a == "often" and smk_b == "never"
    ):
        total += 0.0
    else:
        total += 2.5

    # 2. Drinking (5 pts)
    drk_a = attrs_a.drinking
    drk_b = attrs_b.drinking
    if drk_a is None or drk_b is None:
        total += 3.0
    elif drk_a == drk_b:
        total += 5.0
    elif (drk_a == "never" and drk_b == "social") or (
        drk_a == "social" and drk_b == "never"
    ):
        total += 3.0
    elif (drk_a == "never" and drk_b == "often") or (
        drk_a == "often" and drk_b == "never"
    ):
        total += 0.0
    else:
        total += 3.0

    # 3. Pets (5 pts)
    pet_a = attrs_a.pets
    pet_b = attrs_b.pets
    if pet_a is None or pet_b is None:
        total += 3.0
    elif pet_a == pet_b:
        total += 5.0
    elif pet_a in {"cat", "dog", "want"} and pet_b in {"cat", "dog", "want"}:
        total += 3.0
    elif pet_a == "none" or pet_b == "none":
        total += 2.0
    else:
        total += 3.0

    # 4. Religion / Values (5 pts)
    rel_a = sensitive_a.religion if sensitive_a else None
    rel_b = sensitive_b.religion if sensitive_b else None
    if rel_a is None and rel_b is None:
        total += 1.0
    elif rel_a is None or rel_b is None:
        total += 2.5
    elif rel_a == rel_b:
        total += 5.0
    else:
        total += 2.0

    # 5. Kids intent (5 pts)
    kids_a = attrs_a.wants_children
    kids_b = attrs_b.wants_children
    if kids_a is None and kids_b is None:
        total += 1.0
    elif kids_a is None or kids_b is None:
        total += 2.5
    elif kids_a == kids_b:
        total += 5.0
    elif (kids_a == "yes" and kids_b == "no") or (kids_a == "no" and kids_b == "yes"):
        total += 0.0
    else:
        total += 3.0

    # 6. Education (2.5 pts)
    edu_a = attrs_a.education
    edu_b = attrs_b.education
    if edu_a is None or edu_b is None:
        total += 1.5
    elif edu_a == edu_b:
        total += 2.5
    elif edu_a in {"bachelor", "master", "doctorate"} and edu_b in {
        "bachelor",
        "master",
        "doctorate",
    }:
        total += 2.0
    else:
        total += 1.0

    # 7. Industry (2.5 pts)
    ind_a = attrs_a.industry
    ind_b = attrs_b.industry
    if ind_a is None or ind_b is None:
        total += 1.5
    elif ind_a == ind_b:
        total += 2.5
    elif ind_b in _RELATED_INDUSTRIES.get(
        ind_a, set()
    ) or ind_a in _RELATED_INDUSTRIES.get(ind_b, set()):
        total += 2.0
    else:
        total += 1.0

    return min(25.0, round(total, 2))


def score_interests(
    interests_a: list[str] | None, interests_b: list[str] | None
) -> float:
    """Calculate shared interests score using Overlap Coefficient (0 - 25 points).

    Overlap(A, B) = |A and B| / min(|A|, |B|).
    Score combines overlap ratio (max 15 pts) and count scaling (max 10 pts).
    Identical non-empty sets receive full 25.0 points.
    """
    set_a = set(interests_a or [])
    set_b = set(interests_b or [])

    if not set_a or not set_b:
        return 0.0

    if set_a == set_b:
        return 25.0

    min_len = min(len(set_a), len(set_b))
    if min_len == 0:
        return 0.0

    common_count = len(set_a & set_b)
    if common_count == 0:
        return 0.0

    overlap_ratio = common_count / min_len
    overlap_score = overlap_ratio * 15.0
    count_score = (min(common_count, 3) / 3.0) * 10.0

    total = overlap_score + count_score
    return min(25.0, round(total, 2))


def score_distance(
    distance_km: float | None,
    max_distance_km: float = 50.0,
) -> float:
    """Calculate proximity score based on continuous linear decay (0 - 15 points).

    Formula:
    - distance_km is None -> 5.0 pts (fallback for users in same city without GPS)
    - distance_km <= 0 -> 15.0 pts
    - distance_km > 0 -> max(1.0, round(15.0 * (1.0 - distance_km / safe_max), 2))
      (bounded at min 1.0 pt for any candidate within search radius)
    """
    if distance_km is None:
        return 5.0

    if distance_km <= 0.0:
        return 15.0

    safe_max = max(1.0, max_distance_km)
    ratio = distance_km / safe_max
    decay_score = 15.0 * (1.0 - ratio)
    return min(15.0, max(1.0, round(decay_score, 2)))


def score_activity(
    candidate: User,
    now: datetime | None = None,
) -> float:
    """Calculate activity and profile quality score (0 - 10 points).

    1. Recency (max 6 points):
       - <= 2 hours: 6.0 pts
       - <= 24 hours: 4.0 pts
       - <= 72 hours (3 days): 2.0 pts
       - > 7 days: 0.0 pts
    2. Profile Completeness (max 4 points):
       - Bio > 50 characters: +2.0 pts (or bio > 0: +1.0 pt)
       - At least 1 photo uploaded: +2.0 pts
    """
    current_time = now or datetime.now(UTC)
    total = 0.0

    # 1. Recency
    last_active = candidate.last_active_at or candidate.created_at
    if last_active.tzinfo is None:
        last_active = last_active.replace(tzinfo=UTC)

    delta_seconds = max(0.0, (current_time - last_active).total_seconds())
    delta_hours = delta_seconds / 3600.0

    if delta_hours <= 2.0:
        total += 6.0
    elif delta_hours <= 24.0:
        total += 4.0
    elif delta_hours <= 72.0:
        total += 2.0
    else:
        total += 0.0

    # 2. Profile Completeness
    bio = candidate.public.bio
    if bio and len(bio.strip()) >= 50:
        total += 2.0
    elif bio and len(bio.strip()) > 0:
        total += 1.0

    # Real photos are strictly stored in private tier (Rule Zero)
    photos = (
        getattr(candidate.public, "photos", None) or candidate.private.photo_media_ids
    )
    if photos and len(photos) > 0:
        total += 2.0

    return min(10.0, round(total, 2))


def calculate_match_score(
    user_a: User,
    candidate: User,
    distance_km: float | None = None,
    now: datetime | None = None,
) -> MatchScoreBreakdown:
    """Calculate total compatibility score (0 - 100 points) and component breakdown."""
    intent_pts = score_intent(
        user_a.public.attributes.intent,
        candidate.public.attributes.intent,
    )

    lifestyle_pts = score_lifestyle(
        user_a.public.attributes,
        candidate.public.attributes,
        sensitive_a=user_a.matching.sensitive,
        sensitive_b=candidate.matching.sensitive,
    )

    interests_pts = score_interests(
        user_a.public.interests,
        candidate.public.interests,
    )

    max_dist = 50.0
    if user_a.matching.criteria and user_a.matching.criteria.max_distance_km:
        max_dist = float(user_a.matching.criteria.max_distance_km)

    distance_pts = score_distance(distance_km, max_distance_km=max_dist)

    activity_pts = score_activity(candidate, now=now)

    total_pts = round(
        intent_pts + lifestyle_pts + interests_pts + distance_pts + activity_pts, 2
    )
    clamped_total = max(0.0, min(100.0, total_pts))

    return MatchScoreBreakdown(
        total_score=clamped_total,
        intent_score=intent_pts,
        lifestyle_score=lifestyle_pts,
        interests_score=interests_pts,
        distance_score=distance_pts,
        activity_score=activity_pts,
    )
