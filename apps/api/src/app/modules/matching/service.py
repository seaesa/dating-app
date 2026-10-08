from typing import TYPE_CHECKING

from app.modules.matching.ranking import rank_and_explore
from app.modules.matching.repository import MatchingRepository
from app.modules.matching.schemas import (
    CandidateFilters,
    EligibleCandidate,
    ScoredCandidate,
)
from app.modules.matching.scorer import calculate_match_score
from app.modules.users.models import User

if TYPE_CHECKING:
    from app.modules.users.types import Gender


class MatchingService:
    """Coordinates candidate discovery, filtering, and constraint enforcement."""

    def __init__(self, repository: MatchingRepository | None = None) -> None:
        self.repository = repository or MatchingRepository()

    def resolve_filters(
        self, user: User, override_filters: CandidateFilters | None = None
    ) -> CandidateFilters:
        """Resolve effective search filters from user criteria or request override."""
        if override_filters is not None:
            return override_filters

        criteria = user.matching.criteria
        if criteria is not None:
            return CandidateFilters(
                genders=criteria.genders,
                age_min=criteria.age_min,
                age_max=criteria.age_max,
                max_distance_km=criteria.max_distance_km or 50,
                cities=criteria.cities,
            )

        # Conservative default when criteria has not been saved yet
        default_gender: list[Gender] = []
        if user.public.gender == "male":
            default_gender = ["female"]
        elif user.public.gender == "female":
            default_gender = ["male"]

        return CandidateFilters(
            genders=default_gender,
            age_min=18,
            age_max=50,
            max_distance_km=50,
            cities=[user.public.city] if user.public.city else [],
        )

    def check_dealbreakers(self, user: User, candidate: User) -> bool:
        """Enforce deal-breaker attributes configured as 'required'.

        Per the matching spec: a user may mark lifestyle criteria as dealbreakers.
        If a candidate conflicts with a required value, they are filtered out.
        """
        criteria = user.matching.criteria
        if criteria is None:
            return True

        for attr_key, choice in criteria.attributes.items():
            if choice.level == "required" and choice.values:
                candidate_val = getattr(candidate.public.attributes, attr_key, None)
                if candidate_val is not None and candidate_val not in choice.values:
                    return False

        # Intent dealbreaker
        if criteria.intent.level == "required" and criteria.intent.values:
            cand_intent = candidate.public.attributes.intent
            if cand_intent is not None and cand_intent not in criteria.intent.values:
                return False

        return True

    async def get_eligible_candidates(
        self,
        user: User,
        filters: CandidateFilters | None = None,
        limit: int = 50,
    ) -> list[EligibleCandidate]:
        """Fetch candidates who satisfy 100% of mutual hard filters (Stage 1)."""
        effective_filters = self.resolve_filters(user, filters)
        raw_candidates = await self.repository.find_eligible_candidates(
            user, effective_filters, limit=limit
        )

        # Apply deal-breaker checks
        return [c for c in raw_candidates if self.check_dealbreakers(user, c.user)]

    async def get_ranked_recommendations(
        self,
        user: User,
        filters: CandidateFilters | None = None,
        limit: int = 20,
    ) -> list[ScoredCandidate]:
        """Fetch, score, and rank candidates using 3-stage matching pipeline.

        Stage 1: Filter candidates satisfying mutual hard constraints.
        Stage 2: Score compatibility across 5 dimensions (0-100 pts).
        Stage 3: Apply epsilon-greedy ranking (90% top scores + 10% fresh profiles).
        """
        # Over-fetch pool to ensure diverse ranking candidates
        candidate_pool_limit = max(50, limit * 3)
        eligible = await self.get_eligible_candidates(
            user, filters=filters, limit=candidate_pool_limit
        )

        # Stage 2: Calculate compatibility scores
        scored_candidates: list[ScoredCandidate] = []
        for cand in eligible:
            scores = calculate_match_score(user, cand.user, distance_km=cand.distance_km)
            scored_candidates.append(
                ScoredCandidate(
                    user=cand.user,
                    distance_km=cand.distance_km,
                    scores=scores,
                )
            )

        # Stage 3: Rank and explore
        return rank_and_explore(scored_candidates, page_size=limit)
