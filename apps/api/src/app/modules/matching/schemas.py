from dataclasses import dataclass
from typing import Annotated

from pydantic import Field

from app.core.schemas import BaseSchema
from app.modules.users.models import User
from app.modules.users.schemas import UserRead
from app.modules.users.types import Gender


@dataclass(slots=True)
class EligibleCandidate:
    """Candidate that passed Stage 1 (Mutual Hard Filters)."""

    user: User
    distance_km: float | None = None


class MatchScoreBreakdown(BaseSchema):
    """Detailed breakdown of a candidate's compatibility score (0-100)."""

    total_score: Annotated[float, Field(ge=0.0, le=100.0)]
    intent_score: Annotated[float, Field(ge=0.0, le=25.0)]
    lifestyle_score: Annotated[float, Field(ge=0.0, le=25.0)]
    interests_score: Annotated[float, Field(ge=0.0, le=25.0)]
    distance_score: Annotated[float, Field(ge=0.0, le=15.0)]
    activity_score: Annotated[float, Field(ge=0.0, le=10.0)]


@dataclass(slots=True)
class ScoredCandidate:
    """Candidate with calculated compatibility scores ready for ranking."""

    user: User
    distance_km: float | None
    scores: MatchScoreBreakdown
    is_new: bool = False
    is_boosted: bool = False


class CandidateFilters(BaseSchema):
    """Filters applied to discovery candidate search."""

    genders: list[Gender] = Field(default_factory=list)
    age_min: Annotated[int, Field(ge=18, le=99)] = 18
    age_max: Annotated[int, Field(ge=18, le=99)] = 50
    max_distance_km: Annotated[int, Field(ge=1, le=300)] | None = 50
    cities: list[str] = Field(default_factory=list)


class DiscoveryCandidateRead(BaseSchema):
    """A single candidate returned in discovery feed."""

    user: UserRead
    distance_km: float | None = None
    match_score: float
    score_breakdown: MatchScoreBreakdown | None = None
    is_new: bool = False
    is_boosted: bool = False


class DiscoveryFeedRead(BaseSchema):
    """Discovery feed response."""

    items: list[DiscoveryCandidateRead]
    total_count: int
    next_cursor: str | None = None


class DiscoveryCountRead(BaseSchema):
    """Count of eligible candidates matching filter criteria."""

    count: int
