from typing import Annotated

from beanie import PydanticObjectId
from pydantic import Field, field_validator

from app.core.schemas import BaseSchema
from app.modules.media.models import MediaKind

# An allow-list by type, not a deny-list by extension: an uploader that accepts
# text/html serves stored XSS from your own origin.
ALLOWED_CONTENT_TYPES = frozenset(
    {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"}
)


class UploadUrlBody(BaseSchema):
    kind: MediaKind
    content_type: str
    size: Annotated[int, Field(gt=0)]

    @field_validator("content_type")
    @classmethod
    def _allowed(cls, value: str) -> str:
        if value not in ALLOWED_CONTENT_TYPES:
            raise ValueError(
                f"contentType must be one of {sorted(ALLOWED_CONTENT_TYPES)}"
            )
        return value


class UploadUrlResponse(BaseSchema):
    media_id: PydanticObjectId
    upload_url: str
    expires_in: int
