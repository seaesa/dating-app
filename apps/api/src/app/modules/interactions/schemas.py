from datetime import datetime
from enum import StrEnum

from beanie import PydanticObjectId

from app.core.schemas import BaseSchema
from app.modules.users.schemas import UserRead


class InteractionAction(StrEnum):
    GREET = "greet"  # Quick greeting on home feed
    LIKE = "like"  # Full connect request on profile detail
    PASS = "pass"  # noqa: S105 - Tinder-style pass/skip action, not a password
    STAR = "star"  # Favorite / super like
    BLOCK = "block"  # Block user
    REPORT = "report"  # Report user


class InteractionCreate(BaseSchema):
    target_id: PydanticObjectId
    action: InteractionAction


class InteractionRead(BaseSchema):
    id: PydanticObjectId
    actor_id: PydanticObjectId
    target_id: PydanticObjectId
    action: InteractionAction
    created_at: datetime


class InteractionResultRead(BaseSchema):
    action: InteractionAction
    target_id: PydanticObjectId
    matched: bool = False
    connection_id: PydanticObjectId | None = None


class ReceivedInteractionRead(BaseSchema):
    interaction_id: PydanticObjectId
    actor: UserRead
    action: InteractionAction
    created_at: datetime
    distance_km: float | None = None
