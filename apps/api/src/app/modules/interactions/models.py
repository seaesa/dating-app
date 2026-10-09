from datetime import UTC, datetime
from typing import Annotated, Any, ClassVar

import pymongo
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

from app.core.db import DOCUMENT_MODELS
from app.modules.interactions.schemas import InteractionAction


class UserInteraction(Document):
    actor_id: Annotated[PydanticObjectId, Indexed()]
    target_id: Annotated[PydanticObjectId, Indexed()]
    action: InteractionAction
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "interactions"
        indexes: ClassVar[list[Any]] = [
            pymongo.IndexModel(
                [("actor_id", pymongo.ASCENDING), ("target_id", pymongo.ASCENDING)],
                unique=True,
            ),
            [("actor_id", pymongo.ASCENDING), ("action", pymongo.ASCENDING)],
            [("target_id", pymongo.ASCENDING), ("action", pymongo.ASCENDING)],
        ]


DOCUMENT_MODELS.append(UserInteraction)
