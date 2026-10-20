from datetime import UTC, datetime
from typing import TYPE_CHECKING

from app.modules.matching.ranking import rank_and_explore
from app.modules.matching.repository import MatchingRepository
from app.modules.matching.schemas import (
    CandidateFilters,
    EligibleCandidate,
    ScoredCandidate,
)
from app.modules.matching.scorer import calculate_match_score
from app.modules.users.criteria import DEALBREAKER_KEYS
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

        # Unrestricted default when criteria has not been saved yet
        return CandidateFilters(
            genders=[],
            age_min=18,
            age_max=50,
            max_distance_km=None,
            cities=[],
        )

    def _check_direction_dealbreakers(self, actor: User, target: User) -> bool:
        """Check whether target satisfies actor's required dealbreaker criteria."""
        criteria = actor.matching.criteria
        if criteria is None:
            return True

        for attr_key, choice in criteria.attributes.items():
            if choice.level == "required" and choice.values:
                target_val = getattr(target.public.attributes, attr_key, None)
                if target_val is None:
                    # Strict lifestyle dealbreaker: unspecified cannot satisfy requirement
                    if attr_key in DEALBREAKER_KEYS:
                        return False
                elif target_val not in choice.values:
                    return False

        # Intent dealbreaker
        if criteria.intent.level == "required" and criteria.intent.values:
            target_intent = target.public.attributes.intent
            if target_intent is None or target_intent not in criteria.intent.values:
                return False

        return True

    def check_dealbreakers(self, user: User, candidate: User) -> bool:
        """Enforce mutual deal-breaker attributes configured as 'required'.

        2-way symmetric check:
        1. Candidate must satisfy user's required criteria.
        2. User must satisfy candidate's required criteria.
        """
        # Direction 1: Candidate satisfies user's dealbreakers
        if not self._check_direction_dealbreakers(user, candidate):
            return False

        # Direction 2: User satisfies candidate's dealbreakers
        return self._check_direction_dealbreakers(candidate, user)

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

        # Apply mutual deal-breaker checks and enforce limit
        eligible = [c for c in raw_candidates if self.check_dealbreakers(user, c.user)]
        return eligible[:limit]

    async def get_ranked_recommendations(
        self,
        user: User,
        filters: CandidateFilters | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[ScoredCandidate]:
        """Fetch, score, and rank candidates using 3-stage matching pipeline.

        Stage 1: Filter candidates satisfying mutual hard constraints.
        Stage 2: Score 5 dimensions (0-100 pts) + Reciprocal Boost (+25 pts).
        Stage 3: Apply epsilon-greedy ranking (90% top scores + 10% fresh profiles).
        """
        # Over-fetch pool to ensure diverse ranking candidates across pages
        candidate_pool_limit = max(50, (offset + limit) * 3)
        eligible = await self.get_eligible_candidates(
            user, filters=filters, limit=candidate_pool_limit
        )

        # Stage 2: Calculate compatibility scores & apply Reciprocal / VIP Boost
        admirer_ids = await self.repository.get_inbound_admirer_ids(user.oid)
        scored_candidates: list[ScoredCandidate] = []
        now = datetime.now(UTC)
        for cand in eligible:
            scores = calculate_match_score(user, cand.user, distance_km=cand.distance_km)
            is_admirer = cand.user.oid in admirer_ids
            # Auto Profile Boost for active 99k VIP members
            cand_membership = cand.user.membership
            is_vip_pro = bool(
                cand_membership
                and cand_membership.is_active
                and cand_membership.plan_code == "99k"
                and (
                    cand_membership.expires_at is None or cand_membership.expires_at > now
                )
            )

            bonus = 0.0
            if is_admirer:
                bonus += 25.0
            if is_vip_pro:
                bonus += 30.0  # Auto Profile Boost up to top of feed

            is_boosted = is_admirer or is_vip_pro
            if bonus > 0.0:
                boosted_total = min(100.0, round(scores.total_score + bonus, 2))
                scores = scores.model_copy(update={"total_score": boosted_total})

            scored_candidates.append(
                ScoredCandidate(
                    user=cand.user,
                    distance_km=cand.distance_km,
                    scores=scores,
                    is_boosted=is_boosted,
                )
            )

        # Stage 3: Rank, explore, and slice page
        preferred_genders: list[Gender] = []
        if filters and filters.genders:
            preferred_genders = filters.genders
        elif user.matching.criteria and user.matching.criteria.genders:
            preferred_genders = user.matching.criteria.genders
        elif user.public.gender == "male":
            preferred_genders = ["female"]
        elif user.public.gender == "female":
            preferred_genders = ["male"]

        page_size = offset + limit
        ranked = rank_and_explore(
            scored_candidates,
            page_size=page_size,
            preferred_genders=preferred_genders,
        )
        return ranked[offset : offset + limit]
