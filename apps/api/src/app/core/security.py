from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any
from uuid import uuid4

import jwt

from app.core.config import Settings
from app.core.errors import UnauthorizedError


class TokenType(StrEnum):
    ACCESS = "access"
    REFRESH = "refresh"


def _encode(
    subject: str, settings: Settings, *, token_type: TokenType, ttl: int
) -> tuple[str, str]:
    now = datetime.now(UTC)
    jti = uuid4().hex
    payload: dict[str, Any] = {
        "sub": subject,
        "typ": token_type.value,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=ttl)).timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, jti


def create_access_token(subject: str, settings: Settings) -> str:
    token, _ = _encode(
        subject, settings, token_type=TokenType.ACCESS, ttl=settings.access_token_ttl
    )
    return token


def create_refresh_token(subject: str, settings: Settings) -> tuple[str, str]:
    """Returns (token, jti).

    The jti is stored in Redis so the token can be revoked on logout and
    rotated away on refresh.
    """
    return _encode(
        subject, settings, token_type=TokenType.REFRESH, ttl=settings.refresh_token_ttl
    )


def decode_token(token: str, settings: Settings, *, expect: TokenType) -> dict[str, Any]:
    try:
        payload: dict[str, Any] = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError(detail="The token has expired.") from exc
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedError(detail="The token is invalid.") from exc

    # An access token presented where a refresh token belongs — or the reverse
    # — is a token-confusion attack, so the type is checked, never assumed.
    if payload.get("typ") != expect.value:
        raise UnauthorizedError(detail="Wrong token type.")
    return payload
