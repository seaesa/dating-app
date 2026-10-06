from datetime import UTC, date, datetime


def age_from_birth_year(birth_year: int, now: datetime | None = None) -> int:
    """Age from a birth year, for the public tier.

    The public tier only carries the year, so the age it yields can be off by
    one around a birthday. The full date of birth lives in the private tier
    (`PrivateIdentity.date_of_birth`), where `age_on` gives the exact age.
    Mirrors ageFromBirthYear in @repo/core.
    """
    reference = now or datetime.now(UTC)
    age = reference.year - birth_year
    if age < 0:
        raise ValueError(f"birth_year {birth_year} is in the future")
    return age


def age_on(birth: date, today: date) -> int:
    """Exact age in whole years on `today`."""
    return today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
