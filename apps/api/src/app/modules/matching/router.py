import base64
from typing import Annotated

from fastapi import APIRouter, Query

from app.core.deps import CurrentUser
from app.modules.matching.schemas import (
    CandidateFilters,
    DiscoveryCandidateRead,
    DiscoveryCountRead,
    DiscoveryFeedRead,
)
from app.modules.matching.service import MatchingService
from app.modules.users.types import Gender
from app.modules.users.visibility import RevealScope, project_user

router = APIRouter(prefix="/discovery", tags=["discovery"])


def _decode_cursor(cursor: str | None) -> int:
    """Decode opaque base64 cursor to offset. Fallback to 0 if invalid."""
    if not cursor:
        return 0
    try:
        raw = base64.urlsafe_b64decode(cursor.encode("ascii")).decode("utf-8")
        if raw.startswith("offset:"):
            return max(0, int(raw.split(":", 1)[1]))
    except (ValueError, UnicodeDecodeError):
        return 0
    return 0


def _encode_cursor(offset: int) -> str:
    """Encode offset into opaque base64 cursor."""
    raw = f"offset:{offset}"
    return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("ascii")


def _build_override_filters(
    genders: list[Gender] | None,
    age_min: int | None,
    age_max: int | None,
    max_distance_km: int | None,
    cities: list[str] | None,
) -> CandidateFilters | None:
    """Build candidate filters if any query parameters were provided."""
    has_params = (
        bool(genders)
        or age_min is not None
        or age_max is not None
        or max_distance_km is not None
        or bool(cities)
    )
    if not has_params:
        return None

    effective_max_dist = (
        max_distance_km if (max_distance_km is not None and max_distance_km > 0) else None
    )

    return CandidateFilters(
        genders=genders or [],
        age_min=age_min if age_min is not None else 18,
        age_max=age_max if age_max is not None else 50,
        max_distance_km=effective_max_dist,
        cities=cities or [],
    )


@router.get("", response_model=DiscoveryFeedRead, operation_id="getDiscoveryFeed")
async def get_discovery_feed(
    user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    cursor: Annotated[
        str | None,
        Query(description="Cursor token for pagination"),
    ] = None,
    genders: Annotated[list[Gender] | None, Query()] = None,
    age_min: Annotated[int | None, Query(ge=18, le=99)] = None,
    age_max: Annotated[int | None, Query(ge=18, le=99)] = None,
    max_distance_km: Annotated[int | None, Query(ge=0, le=300)] = None,
    cities: Annotated[list[str] | None, Query()] = None,
) -> DiscoveryFeedRead:
    """Fetch ranked candidate recommendations with 100-pt scoring and exploration."""
    filters = _build_override_filters(genders, age_min, age_max, max_distance_km, cities)
    service = MatchingService()
    offset = _decode_cursor(cursor)
    ranked_candidates = await service.get_ranked_recommendations(
        user, filters=filters, limit=limit + 1, offset=offset
    )

    has_more = len(ranked_candidates) > limit
    page_candidates = ranked_candidates[:limit] if has_more else ranked_candidates
    next_cursor = _encode_cursor(offset + limit) if has_more else None

    items: list[DiscoveryCandidateRead] = []
    for cand in page_candidates:
        # Rule Zero: Strictly project through PUBLIC scope
        projected_user = project_user(cand.user, RevealScope.PUBLIC)
        items.append(
            DiscoveryCandidateRead(
                user=projected_user,
                distance_km=cand.distance_km,
                match_score=cand.scores.total_score,
                score_breakdown=cand.scores,
                is_new=cand.is_new,
                is_boosted=cand.is_boosted,
            )
        )

    return DiscoveryFeedRead(
        items=items,
        total_count=len(items),
        next_cursor=next_cursor,
    )


@router.get("/count", response_model=DiscoveryCountRead, operation_id="getDiscoveryCount")
async def get_discovery_count(
    user: CurrentUser,
    genders: Annotated[list[Gender] | None, Query()] = None,
    age_min: Annotated[int | None, Query(ge=18, le=99)] = None,
    age_max: Annotated[int | None, Query(ge=18, le=99)] = None,
    max_distance_km: Annotated[int | None, Query(ge=0, le=300)] = None,
    cities: Annotated[list[str] | None, Query()] = None,
) -> DiscoveryCountRead:
    """Count eligible candidates matching filter parameters for live filter preview."""
    filters = _build_override_filters(genders, age_min, age_max, max_distance_km, cities)
    service = MatchingService()
    # Fetch candidate pool to compute count
    eligible = await service.get_eligible_candidates(user, filters=filters, limit=200)
    return DiscoveryCountRead(count=len(eligible))
