from datetime import UTC, datetime


def age_from_birth_year(birth_year: int, now: datetime | None = None) -> int:
    """Age from a birth year.

    Only the year is stored, never a full birth date, so age is necessarily
    approximate. That is a privacy decision (spec §5.2), not an oversight.
    Mirrors ageFromBirthYear in @repo/core.
    """
    reference = now or datetime.now(UTC)
    age = reference.year - birth_year
    if age < 0:
        raise ValueError(f"birth_year {birth_year} is in the future")
    return age
