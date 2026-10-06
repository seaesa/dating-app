from datetime import UTC, datetime, timedelta
from typing import Annotated

from beanie import PydanticObjectId
from fastapi import Depends, Request
from fastapi.security import HTTPBearer

from app.core.config import Settings
from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.security import TokenType, decode_token
from app.modules.users.models import User
from app.modules.users.schemas import UserStatus


def get_app_settings(request: Request) -> Settings:
    """The settings this app was built with.

    Read from app state rather than the process-wide get_settings() cache, so
    an app constructed with explicit settings is self-consistent: otherwise a
    token minted with one JWT secret is validated against whatever happens to
    be in the environment, and every request 401s for no visible reason.
    """
    settings: Settings = request.app.state.settings
    return settings


SettingsDep = Annotated[Settings, Depends(get_app_settings)]


# Declared so the scheme reaches the OpenAPI document: without it the
# generated TypeScript client has no auth plumbing and Swagger UI has no
# Authorize button. auto_error is off because reading the header by hand is
# what lets an anonymous viewer through on the public routes.
bearer_scheme = HTTPBearer(auto_error=False, scheme_name="bearerAuth")


def _bearer_token(request: Request) -> str | None:
    header = request.headers.get("Authorization")
    if not header or not header.lower().startswith("bearer "):
        return None
    return header[7:].strip() or None


async def get_optional_user(
    request: Request,
    settings: SettingsDep,
    _scheme: Annotated[object, Depends(bearer_scheme)] = None,
) -> User | None:
    token = _bearer_token(request)
    if token is None:
        return None
    payload = decode_token(token, settings, expect=TokenType.ACCESS)
    user = await User.get(PydanticObjectId(payload["sub"]))
    # The same suspension check get_current_user performs: a ban that covers
    # only the authenticated routes still lets the account browse everyone.
    if user is not None and user.status is UserStatus.SUSPENDED:
        raise ForbiddenError(detail="This account is suspended.")
    return user


async def get_current_user(
    request: Request,
    settings: SettingsDep,
    _scheme: Annotated[object, Depends(bearer_scheme)] = None,
) -> User:
    token = _bearer_token(request)
    if token is None:
        raise UnauthorizedError(detail="Authentication is required.")

    payload = decode_token(token, settings, expect=TokenType.ACCESS)
    user = await User.get(PydanticObjectId(payload["sub"]))
    if user is None:
        # A valid signature for a deleted account is treated as unauthenticated
        # rather than 404, so token validity is not an account-existence oracle.
        raise UnauthorizedError(detail="Authentication is required.")
    if user.status is UserStatus.SUSPENDED:
        raise ForbiddenError(detail="This account is suspended.")
    if user.id is None:  # pragma: no cover - a document read from Mongo has an id
        raise UnauthorizedError(detail="Authentication is required.")
    await _touch_last_active(user)
    return user


LAST_ACTIVE_RESOLUTION = timedelta(minutes=5)


async def _touch_last_active(user: User) -> None:
    """Record activity at most every few minutes.

    A targeted `$set` rather than `user.save()`: the route about to run holds
    this same document and saves it itself; a full save here would race it.
    """
    now = datetime.now(UTC)
    if user.last_active_at and now - user.last_active_at < LAST_ACTIVE_RESOLUTION:
        return
    user.last_active_at = now
    await User.find_one({"_id": user.id}).update({"$set": {"last_active_at": now}})


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
