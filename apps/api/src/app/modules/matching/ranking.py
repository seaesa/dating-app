import math
import random
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta

from app.modules.matching.schemas import ScoredCandidate

EXPLORATION_WINDOW: timedelta = timedelta(hours=48)


def identify_new_candidates(
    candidates: Sequence[ScoredCandidate],
    now: datetime | None = None,
) -> None:
    """Mark candidates created within the last 48 hours as new."""
    current_time = now or datetime.now(UTC)
    for c in candidates:
        created_at = c.user.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=UTC)
        if current_time - created_at <= EXPLORATION_WINDOW:
            c.is_new = True


def rank_and_explore(
    candidates: list[ScoredCandidate],
    page_size: int = 20,
    epsilon: float = 0.1,
    preferred_genders: Sequence[str] | None = None,
    now: datetime | None = None,
    seed: int | None = None,
) -> list[ScoredCandidate]:
    """Rank candidates with an epsilon-greedy strategy (Stage 3).

    - Prioritizes candidates whose gender matches preferred_genders (if specified).
    - 90% (1 - epsilon): Highest compatibility score (Exploitation).
    - 10% (epsilon): Fresh profiles joined within 48h (Exploration).
    """
    if not candidates:
        return []

    identify_new_candidates(candidates, now=now)

    # Sort: preferred gender first (if specified), then by score descending
    pref_set = set(preferred_genders) if preferred_genders else set()

    def _sort_key(c: ScoredCandidate) -> tuple[int, float]:
        is_pref = 1 if (pref_set and c.user.public.gender in pref_set) else 0
        return (is_pref, c.scores.total_score)

    sorted_by_score = sorted(candidates, key=_sort_key, reverse=True)

    if len(candidates) <= page_size:
        return sorted_by_score

    # Determine slots
    explore_slots = max(1, math.floor(page_size * epsilon))
    exploit_slots = page_size - explore_slots

    # Pool of new candidates
    new_pool = [c for c in sorted_by_score if c.is_new]

    rng = random.Random(seed) if seed is not None else random.Random()  # noqa: S311

    # Select candidates for exploration
    chosen_explore: list[ScoredCandidate] = []
    if new_pool:
        # Sample explore candidates without duplicates
        sample_size = min(explore_slots, len(new_pool))
        chosen_explore = rng.sample(new_pool, sample_size)

    explore_ids = {c.user.oid for c in chosen_explore}

    # Select top candidates for exploitation (excluding already chosen explore)
    chosen_exploit: list[ScoredCandidate] = []
    for c in sorted_by_score:
        if c.user.oid not in explore_ids:
            chosen_exploit.append(c)
        if len(chosen_exploit) == exploit_slots:
            break

    # If explore pool was insufficient, backfill from remaining exploit pool
    combined = list(chosen_exploit)
    already_selected_ids = {c.user.oid for c in combined} | explore_ids

    while len(combined) + len(chosen_explore) < page_size:
        backfill_candidate = next(
            (c for c in sorted_by_score if c.user.oid not in already_selected_ids), None
        )
        if not backfill_candidate:
            break
        combined.append(backfill_candidate)
        already_selected_ids.add(backfill_candidate.user.oid)

    # Interleave explore candidates naturally into the feed (e.g. index 4, index 14)
    # This prevents dumping all explore candidates at the end or top
    result = list(combined)
    for idx, exp_cand in enumerate(chosen_explore):
        # Insert explore profile evenly (e.g. at position 4, 14, ...)
        insert_pos = min(len(result), (idx + 1) * (page_size // (explore_slots + 1)))
        result.insert(insert_pos, exp_cand)

    return result[:page_size]
