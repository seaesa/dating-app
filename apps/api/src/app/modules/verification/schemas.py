from typing import Annotated, Literal

from beanie import PydanticObjectId
from pydantic import Field

from app.core.schemas import BaseSchema

Action = Literal["turn_left", "turn_right", "look_straight"]


class ChallengeRead(BaseSchema):
    challenge_id: str
    actions: list[Action]
    expires_in: int


class SubmitBody(BaseSchema):
    challenge_id: Annotated[str, Field(min_length=8, max_length=64)]
    media_ids: Annotated[list[PydanticObjectId], Field(min_length=3, max_length=3)]
