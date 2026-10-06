from app.core.schemas import BaseSchema


class OptionRead(BaseSchema):
    value: str
    label: str
    icon: str | None = None


class AttributeRead(BaseSchema):
    key: str
    label: str
    icon: str | None = None
    group: str
    multi: bool
    matching_only: bool
    options: list[OptionRead]


class InterestGroupRead(BaseSchema):
    label: str
    icon: str | None = None
    options: list[OptionRead]


class ProfileOptionsRead(BaseSchema):
    attributes: list[AttributeRead]
    interest_groups: list[InterestGroupRead]
    max_interests: int
    height_min: int
    height_max: int
