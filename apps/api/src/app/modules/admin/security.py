from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import Settings
from app.core.errors import UnauthorizedError
from app.modules.admin.models import AdminUser

hasher = PasswordHasher()

ADMIN_CLAIM_TYP = "admin_access"
ADMIN_TOKEN_TTL_SECONDS = 8 * 3600  # 8 hours


def hash_password(plain_password: str) -> str:
    """Hash a plain text password with Argon2."""
    return hasher.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against an Argon2 hash."""
    try:
        return hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, Exception):
        return False


def create_admin_token(
    admin: AdminUser,
    settings: Settings,
    *,
    ttl_seconds: int = ADMIN_TOKEN_TTL_SECONDS,
) -> tuple[str, int]:
    """Mint a signed JWT for an administrator.

    Returns (access_token, expires_in_seconds).
    """
    now = datetime.now(UTC)
    exp = now + timedelta(seconds=ttl_seconds)
    payload: dict[str, Any] = {
        "sub": str(admin.oid),
        "username": admin.username,
        "role": admin.role.value,
        "typ": ADMIN_CLAIM_TYP,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, ttl_seconds


def decode_admin_token(token: str, settings: Settings) -> dict[str, Any]:
    """Decode and validate an admin JWT token."""
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError(detail="Token quản trị đã hết hạn.") from exc
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedError(detail="Token quản trị không hợp lệ.") from exc

    if payload.get("typ") != ADMIN_CLAIM_TYP:
        raise UnauthorizedError(detail="Token không có quyền truy cập quản trị.")

    return payload
