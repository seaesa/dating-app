from datetime import UTC, datetime
from typing import Annotated, Any, ClassVar

import pymongo
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

from app.core.db import DOCUMENT_MODELS
from app.modules.notifications.schemas import PushPlatform


class PushDevice(Document):
    user_id: PydanticObjectId
    token: Annotated[str, Indexed(unique=True)]
    platform: PushPlatform
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "push_devices"
        indexes: ClassVar[list[Any]] = [[("user_id", pymongo.ASCENDING)]]


DOCUMENT_MODELS.append(PushDevice)
