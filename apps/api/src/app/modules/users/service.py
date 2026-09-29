from typing import get_args

from beanie import PydanticObjectId
from pydantic import BaseModel

from app.core.config import Settings
from app.core.errors import NotFoundError, ValidationError
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.modules.users.schemas import (
    PrivateIdentityUpdate,
    PublicProfileUpdate,
    UserRead,
    UserStatus,
)
from app.modules.users.visibility import RevealScope, project_user, resolve_scope


def _apply(target: BaseModel, patch: BaseModel) -> None:
    """Apply a patch, distinguishing an omitted field from an explicit null.

    Every field on an update schema is optional so that omitting it means
    "leave it alone". That makes `null` ambiguous: for a nullable target it
    means "clear this", but for a required one it would write None into a
    field the model forbids — and the resulting document no longer parses, so
    the owner cannot even fetch themselves to repair it.

    Nulls are therefore only applied where the target actually permits one.
    """
    changes = patch.model_dump(exclude_unset=True, by_alias=False)
    for field, value in changes.items():
        if value is None and not _accepts_none(target, field):
            raise ValidationError(
                detail=f"{field} cannot be null.",
                errors={field: ["cannot be null"]},
            )
        setattr(target, field, value)


def _accepts_none(target: BaseModel, field: str) -> bool:
    info = type(target).model_fields.get(field)
    if info is None:
        return False
    return type(None) in get_args(info.annotation) or info.annotation is None


class UserService:
    def __init__(
        self,
        settings: Settings,
        repository: UserRepository | None = None,
    ) -> None:
        # Settings are required, not optional with a get_settings() fallback:
        # falling back reads the process environment instead of what the app
        # was built with, so media would be signed against whatever bucket and
        # TTL happened to be set rather than the configured ones.
        self.settings = settings
        self.repository = repository or UserRepository()

    async def _project(self, target: User, scope: RevealScope) -> UserRead:
        """Resolve media URLs at the same point the scope is decided.

        A private photo is presigned only for SELF or REVEALED — the same gate
        the private fields pass through, rather than a second one that could
        drift out of step with it.
        """
        from app.modules.media.service import MediaService

        media = MediaService(self.settings)
        reveals_private = scope is not RevealScope.PUBLIC
        avatar_url = await media.url_for(
            target.public.avatar_media_id,
            owner_id=target.oid,
            # False even for the owner: the avatar is shown to strangers, so a
            # private key must never be signed into it.
            scope_allows_private=False,
        )
        photo_urls = (
            await media.urls_for(target.private.photo_media_ids, owner_id=target.oid)
            if reveals_private
            else []
        )
        return project_user(target, scope, avatar_url=avatar_url, photo_urls=photo_urls)

    async def get_for_viewer(
        self, user_id: PydanticObjectId, viewer: User | None
    ) -> UserRead:
        target = await self.repository.get(user_id)
        if target is None:
            raise NotFoundError(detail="No such user.")
        scope = await resolve_scope(target, viewer)
        return await self._project(target, scope)

    async def get_me(self, user: User) -> UserRead:
        return await self._project(user, RevealScope.SELF)

    async def update_profile(self, user: User, patch: PublicProfileUpdate) -> UserRead:
        _apply(user.public, patch)
        # The first successful profile edit completes onboarding.
        if user.status is UserStatus.PENDING_ONBOARDING:
            user.status = UserStatus.ACTIVE
        await user.save()
        return await self._project(user, RevealScope.SELF)

    async def update_identity(self, user: User, patch: PrivateIdentityUpdate) -> UserRead:
        _apply(user.private, patch)
        await user.save()
        return await self._project(user, RevealScope.SELF)
