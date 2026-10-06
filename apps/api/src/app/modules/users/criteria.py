from typing import Annotated, Literal

from pydantic import Field, field_validator, model_validator

from app.core.schemas import BaseSchema
from app.modules.catalog.options import (
    ATTRIBUTE_KEYS,
    HEIGHT_MAX,
    HEIGHT_MIN,
    INTEREST_VALUES,
    values_of,
)
from app.modules.users.types import Gender

Level = Literal["required", "preferred", "any"]

_EXTENDED_KEYS = ATTRIBUTE_KEYS - {"intent"}
# `required` removes a candidate outright. Per the matching specification a
# user may make at most ONE lifestyle value a dealbreaker; every other
# attribute can at most be `preferred`, or people filter themselves to nobody.
DEALBREAKER_KEYS = frozenset(
    {"smoking", "drinking", "has_children", "wants_children", "religion", "pets"}
)
MAX_DEALBREAKERS = 1


class ChoiceCriterion(BaseSchema):
    values: Annotated[list[str], Field(max_length=20)] = Field(default_factory=list)
    level: Level = "any"


class RangeCriterion(BaseSchema):
    min: Annotated[int, Field(ge=HEIGHT_MIN, le=HEIGHT_MAX)] | None = None
    max: Annotated[int, Field(ge=HEIGHT_MIN, le=HEIGHT_MAX)] | None = None
    level: Level = "any"

    @model_validator(mode="after")
    def _ordered(self) -> "RangeCriterion":
        if self.min is not None and self.max is not None and self.min > self.max:
            raise ValueError("min must not exceed max")
        if self.level == "required":
            raise ValueError("this criterion cannot be required")
        return self


class MatchCriteria(BaseSchema):
    genders: Annotated[list[Gender], Field(min_length=1, max_length=3)]
    age_min: Annotated[int, Field(ge=18, le=99)]
    age_max: Annotated[int, Field(ge=18, le=99)]
    # Optional extra areas; distance is the main geographic filter.
    cities: Annotated[list[str], Field(max_length=10)] = Field(default_factory=list)
    # Hard filter on distance; applies once the user's location is known.
    max_distance_km: Annotated[int, Field(ge=1, le=300)] | None = None
    intent: ChoiceCriterion = Field(default_factory=ChoiceCriterion)
    height: RangeCriterion = Field(default_factory=RangeCriterion)
    interests: ChoiceCriterion = Field(default_factory=ChoiceCriterion)
    attributes: dict[str, ChoiceCriterion] = Field(default_factory=dict)

    @field_validator("cities")
    @classmethod
    def _city_length(cls, value: list[str]) -> list[str]:
        if any(not city or len(city) > 64 for city in value):
            raise ValueError("each city must be 1 to 64 characters")
        return value

    @model_validator(mode="after")
    def _consistent(self) -> "MatchCriteria":
        if self.age_min > self.age_max:
            raise ValueError("ageMin must not exceed ageMax")

        for value in self.intent.values:
            if value not in values_of("intent"):
                raise ValueError(f"intent: {value!r} is not an option")

        if self.interests.level == "required":
            raise ValueError("interests cannot be required")
        for value in self.interests.values:
            if value not in INTEREST_VALUES:
                raise ValueError(f"interests: {value!r} is not an option")

        dealbreakers = 0
        for key, criterion in self.attributes.items():
            if key not in _EXTENDED_KEYS:
                raise ValueError(f"{key!r} is not a criterion")
            if criterion.level == "required":
                if key not in DEALBREAKER_KEYS:
                    raise ValueError(f"{key} cannot be required")
                if not criterion.values:
                    raise ValueError(f"{key}: a required criterion needs values")
                dealbreakers += 1
            for value in criterion.values:
                if value not in values_of(key):
                    raise ValueError(f"{key}: {value!r} is not an option")
        if dealbreakers > MAX_DEALBREAKERS:
            raise ValueError(f"at most {MAX_DEALBREAKERS} lifestyle dealbreaker")
        return self
