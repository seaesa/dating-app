from beanie import PydanticObjectId

from app.core.config import Settings
from app.core.errors import UnauthorizedError
from app.core.security import TokenType, decode_token
from app.modules.users.models import User
from app.modules.users.schemas import UserStatus

CLOSE_AUTH = 4401
CLOSE_FORBIDDEN = 4403


class SocketAuthError(Exception):
    def __init__(self, code: int) -> None:
        super().__init__(code)
        self.code = code


async def authenticate_socket(
    header: str | None, settings: Settings, token: str | None = None
) -> tuple[User, float]:
    """The user behind a socket and when their access token expires."""
    raw_token = token
    if not raw_token and header and header.lower().startswith("bearer "):
        raw_token = header[7:].strip()
    if not raw_token:
        raise SocketAuthError(CLOSE_AUTH)
    try:
        payload = decode_token(raw_token, settings, expect=TokenType.ACCESS)
    except UnauthorizedError as exc:
        raise SocketAuthError(CLOSE_AUTH) from exc
    try:
        user = await User.get(PydanticObjectId(payload["sub"]))
    except Exception as exc:
        raise SocketAuthError(CLOSE_AUTH) from exc
    if user is None:
        raise SocketAuthError(CLOSE_AUTH)
    if user.status is UserStatus.SUSPENDED:
        raise SocketAuthError(CLOSE_FORBIDDEN)
    return user, float(payload["exp"])
