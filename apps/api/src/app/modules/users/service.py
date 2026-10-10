from datetime import UTC, datetime
from typing import get_args

from beanie import PydanticObjectId
from pydantic import BaseModel

from app.core.config import Settings
from app.core.errors import NotFoundError, ValidationError
from app.modules.users.criteria import MatchCriteria
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.modules.users.schemas import (
    PrivateIdentityUpdate,
    PublicProfileUpdate,
    SensitiveAttributes,
    UserRead,
    UserStatus,
    VerificationStatus,
)
from app.modules.users.visibility import (
    NO_GRANTS,
    Grants,
    RevealScope,
    project_user,
    resolve_scope,
)

# Photos a profile needs before it can go live; one photo is too easy to fake.
# Mirrored by MIN_PHOTOS in @repo/api-contract.
MIN_PHOTOS = 2


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

    async def _project(
        self, target: User, scope: RevealScope, grants: Grants = NO_GRANTS
    ) -> UserRead:
        """Resolve media URLs at the same point the scope is decided.

        A private photo is presigned only for SELF or a pair with photos granted
        — the same gate the private fields pass through, rather than a second one
        that could drift out of step with it.
        """
        from app.modules.media.service import MediaService

        signs_photos = scope is RevealScope.SELF or (
            scope is RevealScope.REVEALED and grants.photos
        )
        photos = (
            await MediaService(self.settings).signed_for(
                target.private.photo_media_ids, owner_id=target.oid
            )
            if signs_photos
            else []
        )
        attempts_left = target.private.verification.attempts_left(
            self.settings.verification_max_attempts_per_day,
            datetime.now(UTC).date().isoformat(),
        )
        return project_user(
            target,
            scope,
            grants=grants,
            photos=photos,
            attempts_left=attempts_left,
            verification_available=self.settings.verification_enabled,
        )

    async def get_for_viewer(
        self, user_id: PydanticObjectId, viewer: User | None
    ) -> UserRead:
        target = await self.repository.get(user_id)
        if target is None:
            raise NotFoundError(detail="No such user.")
        visibility = await resolve_scope(target, viewer)
        return await self._project(target, visibility.scope, visibility.grants)

    async def project_peers(
        self, peers: list[tuple[User, Grants]]
    ) -> dict[PydanticObjectId, UserRead]:
        """Project many chat peers at once, signing only first photos, in one batch."""
        from app.modules.media.service import MediaService

        firsts = {
            user.oid: user.private.photo_media_ids[0]
            for user, grants in peers
            if grants.photos and user.private.photo_media_ids
        }
        urls = (
            await MediaService(self.settings).signed_for_owners(
                [(media_id, owner) for owner, media_id in firsts.items()]
            )
            if firsts
            else {}
        )
        projected: dict[PydanticObjectId, UserRead] = {}
        for user, grants in peers:
            media_id = firsts.get(user.oid)
            photos = (
                [(media_id, urls[media_id])]
                if media_id is not None and media_id in urls
                else []
            )
            scope = RevealScope.REVEALED if grants.any else RevealScope.PUBLIC
            projected[user.oid] = project_user(user, scope, grants=grants, photos=photos)
        return projected

    async def get_me(self, user: User) -> UserRead:
        return await self._project(user, RevealScope.SELF)

    async def update_profile(self, user: User, patch: PublicProfileUpdate) -> UserRead:
        _apply(user.public, patch)
        await user.save()
        return await self._project(user, RevealScope.SELF)

    async def update_identity(self, user: User, patch: PrivateIdentityUpdate) -> UserRead:
        if "date_of_birth" in patch.model_fields_set and patch.date_of_birth is None:
            raise ValidationError(
                detail="dateOfBirth cannot be null.",
                errors={"dateOfBirth": ["cannot be null"]},
            )
        if (
            patch.date_of_birth is not None
            and user.private.date_of_birth is not None
            and patch.date_of_birth != user.private.date_of_birth
        ):
            # Locked once set: changing it would let someone slip past the age
            # check or rewrite who they match with. Support handles real typos.
            raise ValidationError(
                detail="dateOfBirth cannot be changed.",
                errors={"dateOfBirth": ["locked"]},
            )
        old_reference = next(iter(user.private.photo_media_ids), None)
        _apply(user.private, patch)
        new_reference = next(iter(user.private.photo_media_ids), None)
        if new_reference != old_reference:
            # The badge vouches for one face. Another photo has to be checked
            # again, or a verified account could swap in someone else.
            state = user.private.verification
            state.status = VerificationStatus.UNVERIFIED
            state.verified_at = None
            state.score = None
            state.failure_reason = None
        if patch.date_of_birth is not None:
            # The public tier keeps only the year; derive it here so the two
            # tiers cannot drift apart.
            user.public.birth_year = int(patch.date_of_birth[:4])
        await user.save()
        return await self._project(user, RevealScope.SELF)

    async def update_sensitive(self, user: User, patch: SensitiveAttributes) -> UserRead:
        user.matching.sensitive = patch
        await user.save()
        return await self._project(user, RevealScope.SELF)

    async def update_criteria(self, user: User, criteria: MatchCriteria) -> UserRead:
        user.matching.criteria = criteria
        await user.save()
        return await self._project(user, RevealScope.SELF)

    async def complete_onboarding(self, user: User) -> UserRead:
        """Finish sign-up once the profile has what a match card needs.

        Location is not required here: someone who declines it still gets in,
        and stays out of others' suggestions until a location is stored.
        """
        missing = [
            name
            for name, present in (
                ("displayName", user.public.display_name),
                ("dateOfBirth", user.private.date_of_birth),
                ("gender", user.public.gender),
                ("photoMediaIds", len(user.private.photo_media_ids) >= MIN_PHOTOS),
                ("criteria", user.matching.criteria),
            )
            if not present
        ]
        if missing:
            raise ValidationError(
                detail="The profile is not complete yet.",
                errors={name: ["required"] for name in missing},
            )
        if user.status is UserStatus.PENDING_ONBOARDING:
            user.status = UserStatus.ACTIVE
            await user.save()
        return await self._project(user, RevealScope.SELF)
