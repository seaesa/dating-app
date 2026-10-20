from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from beanie import PydanticObjectId

from app.core.age import age_from_birth_year
from app.modules.users.models import User
from app.modules.users.schemas import (
    AccountRead,
    PhotoRead,
    PrivateIdentityRead,
    PublicProfileRead,
    UserRead,
    VerificationRead,
    VerificationStatus,
)

if TYPE_CHECKING:
    from app.modules.connections.models import Connection


class RevealScope(StrEnum):
    SELF = "self"
    REVEALED = "revealed"
    PUBLIC = "public"


@dataclass(frozen=True)
class Grants:
    """What the two sides of a pair have mutually opened to each other."""

    photos: bool = False

    @property
    def any(self) -> bool:
        return self.photos


NO_GRANTS = Grants()


@dataclass(frozen=True)
class Visibility:
    scope: RevealScope
    grants: Grants = NO_GRANTS


def grants_of(connection: "Connection | None") -> Grants:
    """Only an accepted connection grants anything; a closed one grants nothing."""
    from app.modules.connections.models import ConnectionStatus, RevealState

    if connection is None or connection.status is not ConnectionStatus.ACCEPTED:
        return NO_GRANTS
    return Grants(
        photos=connection.reveals.photos.state is RevealState.GRANTED,
    )


async def resolve_scope(target: User, viewer: User | None) -> Visibility:
    """Decide how much of `target` `viewer` may see.

    Grants are per pair: the lookup is the connection between exactly these two
    users, so what A opened to B never reaches C.
    """
    if viewer is not None and viewer.id == target.id:
        return Visibility(RevealScope.SELF)
    if viewer is None:
        return Visibility(RevealScope.PUBLIC)

    from app.modules.connections.repository import ConnectionRepository

    connection = await ConnectionRepository().find_between(viewer.oid, target.oid)
    grants = grants_of(connection)
    if grants.any:
        return Visibility(RevealScope.REVEALED, grants)
    return Visibility(RevealScope.PUBLIC)


def project_user(
    target: User,
    scope: RevealScope,
    *,
    grants: Grants = NO_GRANTS,
    photos: list[tuple[PydanticObjectId, str]] | None = None,
    attempts_left: int = 0,
    verification_available: bool = False,
) -> UserRead:
    """The only function permitted to turn a User into a response.

    Every route goes through here. Serializing a User anywhere else is a
    defect: it bypasses this gate and can leak the private tier.

    Media URLs are passed in rather than built here, so this module stays free
    of storage concerns and the caller presigns only when the scope and grants
    allow it.
    """
    verification = target.private.verification
    now = datetime.now(UTC)
    is_vip = bool(
        target.membership.is_active
        and (target.membership.expires_at is None or target.membership.expires_at > now)
    )
    profile = PublicProfileRead(
        display_name=target.public.display_name,
        age=age_from_birth_year(target.public.birth_year),
        city=target.public.city,
        gender=target.public.gender,
        bio=target.public.bio,
        attributes=target.public.attributes,
        interests=target.public.interests,
        prompts=target.public.prompts,
        verified=verification.status is VerificationStatus.VERIFIED,
        is_vip=is_vip,
        vip_plan=target.membership.plan_code if is_vip else None,
    )

    if scope is RevealScope.PUBLIC:
        return UserRead(
            id=target.oid,
            status=target.status,
            profile=profile,
            created_at=target.created_at,
        )

    is_self = scope is RevealScope.SELF
    identity = PrivateIdentityRead(
        # The name is public (displayName); the real name and socials stay with
        real_name=(target.private.real_name or target.public.display_name)
        if is_self
        else None,
        photo_urls=[url for _, url in photos or []] if is_self or grants.photos else [],
        socials=target.private.socials if is_self else {},
    )

    # Only the owner reads the account tier. REVEALED stops at `identity`.
    account = (
        AccountRead(
            date_of_birth=target.private.date_of_birth,
            photos=[PhotoRead(media_id=mid, url=url) for mid, url in photos or []],
            location=target.private.location,
            verification=VerificationRead(
                status=verification.status,
                attempts_left=attempts_left,
                consented=verification.consent_at is not None,
                failure_reason=verification.failure_reason,
                available=verification_available,
            ),
            sensitive=target.matching.sensitive,
            criteria=target.matching.criteria,
            membership=target.membership,
        )
        if is_self
        else None
    )

    return UserRead(
        id=target.oid,
        status=target.status,
        profile=profile,
        identity=identity,
        account=account,
        phone=target.phone if is_self else None,
        created_at=target.created_at,
    )
