from datetime import UTC, datetime
from enum import StrEnum
from typing import Any, ClassVar

import pymongo
from beanie import Document, PydanticObjectId
from pydantic import Field

from app.core.db import DOCUMENT_MODELS


class MediaKind(StrEnum):
    PUBLIC = "public"
    PRIVATE = "private"
    # Sent in a chat: signed for the two members of the room, never the profile.
    CHAT = "chat"


class MediaStatus(StrEnum):
    PENDING = "pending"
    READY = "ready"


class FaceCheck(StrEnum):
    """Whether a profile photo can be the main one: it shows the owner's face."""

    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"


class MediaAsset(Document):
    owner_id: PydanticObjectId
    kind: MediaKind
    key: str
    content_type: str
    size: int
    status: MediaStatus = MediaStatus.PENDING
    # Profile photos only, while the check is enabled; None means unchecked.
    face_check: FaceCheck | None = None
    face_check_reason: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @property
    def oid(self) -> PydanticObjectId:
        """The id, without Beanie's Optional. See User.oid."""
        if self.id is None:  # pragma: no cover - inserted documents have one
            raise RuntimeError("MediaAsset has no id; it was never saved")
        return self.id

    class Settings:
        name = "media_assets"
        indexes: ClassVar[list[Any]] = [
            [("owner_id", pymongo.ASCENDING), ("status", pymongo.ASCENDING)],
        ]


DOCUMENT_MODELS.append(MediaAsset)
