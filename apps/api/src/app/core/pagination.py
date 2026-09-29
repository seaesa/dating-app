import base64
import binascii

from beanie import PydanticObjectId
from bson.errors import InvalidId

from app.core.errors import ValidationError


def encode_cursor(value: object) -> str:
    """Opaque cursor.

    Base64 rather than a raw id, so the value reads as a token to pass back
    untouched rather than an identifier to construct.
    """
    return base64.urlsafe_b64encode(str(value).encode()).decode().rstrip("=")


def decode_cursor(cursor: str) -> PydanticObjectId:
    padded = cursor + "=" * (-len(cursor) % 4)
    try:
        raw = base64.urlsafe_b64decode(padded.encode()).decode()
        return PydanticObjectId(raw)
    except (binascii.Error, InvalidId, UnicodeDecodeError, ValueError) as exc:
        # A tampered or stale cursor is the client's problem, not a crash.
        raise ValidationError(
            detail="The cursor is malformed.", errors={"cursor": ["invalid"]}
        ) from exc
