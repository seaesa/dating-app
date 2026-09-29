from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal

from beanie import PydanticObjectId
from pydantic import BaseModel, ConfigDict, Field

from app.core.schemas import BaseSchema


class UserStatus(StrEnum):
    PENDING_ONBOARDING = "pending_onboarding"
    ACTIVE = "active"
    SUSPENDED = "suspended"


class GeoPoint(BaseSchema):
    """GeoJSON point.

    Longitude first — MongoDB's 2dsphere index requires that order, and
    reversing it silently places everyone in the wrong hemisphere.
    """

    type: Literal["Point"] = "Point"
    coordinates: Annotated[list[float], Field(min_length=2, max_length=2)]


class PublicProfile(BaseModel):
    # validate_assignment so a bad write fails loudly instead of persisting a
    # document that no longer parses — an unparseable user cannot be repaired
    # through the API, because the dependency that loads them runs first.
    model_config = ConfigDict(validate_assignment=True)

    """The persona every viewer may see."""

    nickname: Annotated[str, Field(min_length=2, max_length=32)]
    birth_year: Annotated[int, Field(ge=1900, le=2100)]
    city: Annotated[str, Field(max_length=64)]
    bio: Annotated[str, Field(max_length=500)] = ""
    interests: Annotated[list[str], Field(max_length=20)] = []
    avatar_media_id: PydanticObjectId | None = None


class PrivateIdentity(BaseModel):
    # validate_assignment so a bad write fails loudly instead of persisting a
    # document that no longer parses — an unparseable user cannot be repaired
    # through the API, because the dependency that loads them runs first.
    model_config = ConfigDict(validate_assignment=True)

    """Locked until both sides of a match consent.

    Adding a field here automatically widens PRIVATE_FIELD_NAMES, which is what
    makes the leak test self-maintaining.
    """

    real_name: str | None = None
    photo_media_ids: list[PydanticObjectId] = []
    socials: dict[str, str] = {}
    location: GeoPoint | None = None


# ---- Read schemas -----------------------------------------------------------


class PublicProfileRead(BaseSchema):
    nickname: str
    age: int
    city: str
    bio: str
    interests: list[str]
    avatar_url: str | None = None


class PrivateIdentityRead(BaseSchema):
    real_name: str | None
    photo_urls: list[str]
    socials: dict[str, str]
    location: GeoPoint | None


class UserRead(BaseSchema):
    """The only user-shaped response the API emits.

    `identity` and `phone` are None for a public viewer. They are optional
    rather than absent so the generated TypeScript has one type for a user and
    the client branches on null instead of on two different shapes.
    """

    id: PydanticObjectId
    status: UserStatus
    profile: PublicProfileRead
    identity: PrivateIdentityRead | None = None
    phone: str | None = None
    created_at: datetime


# ---- Write schemas ----------------------------------------------------------


class PublicProfileUpdate(BaseSchema):
    nickname: Annotated[str, Field(min_length=2, max_length=32)] | None = None
    birth_year: Annotated[int, Field(ge=1900, le=2100)] | None = None
    city: Annotated[str, Field(max_length=64)] | None = None
    bio: Annotated[str, Field(max_length=500)] | None = None
    interests: Annotated[list[str], Field(max_length=20)] | None = None
    avatar_media_id: PydanticObjectId | None = None


class PrivateIdentityUpdate(BaseSchema):
    real_name: str | None = None
    photo_media_ids: list[PydanticObjectId] | None = None
    socials: dict[str, str] | None = None
    location: GeoPoint | None = None
