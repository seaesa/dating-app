from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Annotated, Literal

from beanie import PydanticObjectId
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.age import age_on
from app.core.schemas import BaseSchema
from app.modules.catalog.options import (
    HEIGHT_MAX,
    HEIGHT_MIN,
    INTEREST_VALUES,
    MAX_INTERESTS,
    PUBLIC_SINGLE_KEYS,
    values_of,
)
from app.modules.users.criteria import MatchCriteria
from app.modules.users.types import Gender


class UserStatus(StrEnum):
    PENDING_ONBOARDING = "pending_onboarding"
    ACTIVE = "active"
    SUSPENDED = "suspended"


class VerificationStatus(StrEnum):
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class GeoPoint(BaseSchema):
    """GeoJSON point.

    Longitude first — MongoDB's 2dsphere index requires that order, and
    reversing it silently places everyone in the wrong hemisphere.
    """

    type: Literal["Point"] = "Point"
    coordinates: Annotated[list[float], Field(min_length=2, max_length=2)]


# ---- Stored tiers -----------------------------------------------------------


class ProfileAttributes(BaseSchema):
    """Self-declared traits every viewer of a profile may see.

    Each value is a key from the catalog, validated against it, so a client
    cannot store a label the app has no translation for.
    """

    intent: str | None = None
    education: str | None = None
    industry: str | None = None
    has_children: str | None = None
    wants_children: str | None = None
    smoking: str | None = None
    drinking: str | None = None
    exercise: str | None = None
    pets: str | None = None
    diet: str | None = None
    mbti: str | None = None
    love_language: str | None = None
    zodiac: str | None = None
    height_cm: Annotated[int, Field(ge=HEIGHT_MIN, le=HEIGHT_MAX)] | None = None
    # Free text, like Hinge: people name their home town the way they know it.
    hometown: Annotated[str, Field(min_length=1, max_length=64)] | None = None
    languages: Annotated[list[str], Field(max_length=7)] = Field(default_factory=list)

    @model_validator(mode="after")
    def _in_catalog(self) -> "ProfileAttributes":
        for key in PUBLIC_SINGLE_KEYS:
            value = getattr(self, key)
            if value is not None and value not in values_of(key):
                raise ValueError(f"{key}: {value!r} is not an option")
        if len(set(self.languages)) != len(self.languages):
            raise ValueError("languages must be unique")
        for value in self.languages:
            if value not in values_of("languages"):
                raise ValueError(f"languages: {value!r} is not an option")
        return self


class SensitiveAttributes(BaseSchema):
    """Sensitive personal data. Read by the owner and the matching engine only."""

    marital_status: str | None = None
    religion: str | None = None

    @model_validator(mode="after")
    def _in_catalog(self) -> "SensitiveAttributes":
        for key in ("marital_status", "religion"):
            value = getattr(self, key)
            if value is not None and value not in values_of(key):
                raise ValueError(f"{key}: {value!r} is not an option")
        return self


def check_interests(value: list[str] | None) -> list[str] | None:
    """Shared by the stored model and the update schema; None means "not sent"."""
    if value is None:
        return None
    if len(set(value)) != len(value):
        raise ValueError("interests must be unique")
    unknown = [item for item in value if item not in INTEREST_VALUES]
    if unknown:
        raise ValueError(f"unknown interests: {unknown}")
    return value


class ProfilePrompt(BaseSchema):
    """Icebreaker question and answer."""

    prompt_id: Annotated[str, Field(min_length=1, max_length=64)]
    question: Annotated[str, Field(min_length=1, max_length=200)]
    answer: Annotated[str, Field(min_length=1, max_length=500)]


class PublicProfile(BaseModel):
    """The persona every viewer may see: never a name or a photo."""

    # validate_assignment so a bad write fails loudly instead of persisting a
    # document that no longer parses — an unparseable user cannot be repaired
    # through the API, because the dependency that loads them runs first.
    model_config = ConfigDict(validate_assignment=True)

    # The name other people see: a first name or nickname the user picks. The
    # real full name, if collected, stays in PrivateIdentity.
    display_name: Annotated[str, Field(max_length=32)] = ""
    birth_year: Annotated[int, Field(ge=1900, le=2100)]
    city: Annotated[str, Field(max_length=64)]
    gender: Gender | None = None
    bio: Annotated[str, Field(max_length=500)] = ""
    attributes: ProfileAttributes = Field(default_factory=ProfileAttributes)
    interests: Annotated[list[str], Field(max_length=MAX_INTERESTS)] = []
    prompts: Annotated[list[ProfilePrompt], Field(max_length=5)] = Field(
        default_factory=list
    )

    @field_validator("interests")
    @classmethod
    def _interests_valid(cls, value: list[str]) -> list[str]:
        return check_interests(value) or []


class VerificationState(BaseModel):
    """Where the face check stands. The result only, never the images."""

    model_config = ConfigDict(validate_assignment=True)

    status: VerificationStatus = VerificationStatus.UNVERIFIED
    score: float | None = None
    consent_at: datetime | None = None
    consent_version: str | None = None
    submitted_at: datetime | None = None
    verified_at: datetime | None = None
    # Why the last attempt failed, so the app can tell the user what to fix.
    failure_reason: str | None = None
    # ISO date strings: Beanie encodes `datetime` reliably, `date` less so.
    attempts_day: str | None = None
    attempts_today: int = 0

    def attempts_left(self, limit: int, today: str) -> int:
        used = self.attempts_today if self.attempts_day == today else 0
        return max(0, limit - used)


def _iso_date(value: str | None) -> str | None:
    if value is None:
        return None
    return date.fromisoformat(value).isoformat()


class PrivateIdentity(BaseModel):
    """Locked until both sides of a match consent. Only project_user() reads it."""

    model_config = ConfigDict(validate_assignment=True)

    real_name: str | None = None
    # The exact date of birth stays private; the public tier keeps the year.
    date_of_birth: str | None = None
    photo_media_ids: list[PydanticObjectId] = []
    socials: dict[str, str] = {}
    location: GeoPoint | None = None
    verification: VerificationState = Field(default_factory=VerificationState)

    @field_validator("date_of_birth")
    @classmethod
    def _dob_valid(cls, value: str | None) -> str | None:
        return _iso_date(value)


class MatchingProfile(BaseModel):
    """Inputs for the matching engine that no other viewer may read."""

    model_config = ConfigDict(validate_assignment=True)

    sensitive: SensitiveAttributes = Field(default_factory=SensitiveAttributes)
    criteria: MatchCriteria | None = None


# ---- Read schemas -----------------------------------------------------------


class PublicProfileRead(BaseSchema):
    display_name: str
    age: int
    city: str
    gender: Gender | None = None
    bio: str
    attributes: ProfileAttributes
    interests: list[str]
    prompts: list[ProfilePrompt] = Field(default_factory=list)
    verified: bool


class PrivateIdentityRead(BaseSchema):
    real_name: str | None
    photo_urls: list[str]
    socials: dict[str, str]


class VerificationRead(BaseSchema):
    status: VerificationStatus
    attempts_left: int
    consented: bool
    failure_reason: str | None = None
    # False while face verification is switched off; the app hides it.
    available: bool = False


class PhotoRead(BaseSchema):
    media_id: PydanticObjectId
    url: str


class UserMembership(BaseSchema):
    """Membership tier status stored on User and exposed to owner."""

    is_active: bool = False
    plan_code: str | None = None
    started_at: datetime | None = None
    expires_at: datetime | None = None
    auto_renew: bool = False


class AccountRead(BaseSchema):
    """What only the account owner sees about their own account."""

    date_of_birth: str | None
    # Ids alongside URLs, so the owner can remove or reorder a photo.
    photos: list[PhotoRead]
    # Owner only, never `identity`: even a revealed match must not get GPS
    # coordinates. Matching uses it server side for distance.
    location: GeoPoint | None
    verification: VerificationRead
    sensitive: SensitiveAttributes
    criteria: MatchCriteria | None
    membership: UserMembership = Field(default_factory=UserMembership)


class UserRead(BaseSchema):
    """The only user-shaped response the API emits.

    `identity`, `account` and `phone` are None for a public viewer. They are
    optional rather than absent so the generated TypeScript has one type for a
    user and the client branches on null instead of on two different shapes.
    `account` is stricter than `identity`: it is SELF only, because `identity`
    is also what a revealed match will see.
    """

    id: PydanticObjectId
    status: UserStatus
    profile: PublicProfileRead
    identity: PrivateIdentityRead | None = None
    account: AccountRead | None = None
    phone: str | None = None
    created_at: datetime


# ---- Write schemas ----------------------------------------------------------


class PublicProfileUpdate(BaseSchema):
    display_name: Annotated[str, Field(min_length=2, max_length=32)] | None = None
    city: Annotated[str, Field(max_length=64)] | None = None
    gender: Gender | None = None
    bio: Annotated[str, Field(max_length=500)] | None = None
    attributes: ProfileAttributes | None = None
    interests: Annotated[list[str], Field(max_length=MAX_INTERESTS)] | None = None
    prompts: Annotated[list[ProfilePrompt], Field(max_length=5)] | None = None

    @field_validator("interests")
    @classmethod
    def _interests_valid(cls, value: list[str] | None) -> list[str] | None:
        return check_interests(value)


class PrivateIdentityUpdate(BaseSchema):
    real_name: Annotated[str, Field(min_length=2, max_length=64)] | None = None
    date_of_birth: str | None = None
    photo_media_ids: Annotated[list[PydanticObjectId], Field(max_length=6)] | None = None
    socials: dict[str, str] | None = None
    location: GeoPoint | None = None

    @field_validator("date_of_birth")
    @classmethod
    def _adult(cls, value: str | None) -> str | None:
        if value is None:
            return None
        try:
            born = date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("dateOfBirth must be YYYY-MM-DD") from exc
        age = age_on(born, datetime.now(UTC).date())
        if age < 18:
            raise ValueError("you must be at least 18")
        if age > 100:
            raise ValueError("dateOfBirth is not valid")
        return born.isoformat()
