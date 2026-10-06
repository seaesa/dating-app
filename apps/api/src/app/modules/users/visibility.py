from enum import StrEnum

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


class RevealScope(StrEnum):
    SELF = "self"
    REVEALED = "revealed"
    PUBLIC = "public"


async def resolve_scope(target: User, viewer: User | None) -> RevealScope:
    """Decide how much of `target` `viewer` may see.

    EXTENSION POINT — identity exchange. When IdentityExchange lands, look it
    up here and return REVEALED only when BOTH sides have consented and neither
    has revoked. Until then a stranger always gets PUBLIC, which is the correct
    conservative default.
    """
    if viewer is not None and viewer.id == target.id:
        return RevealScope.SELF
    return RevealScope.PUBLIC


def project_user(
    target: User,
    scope: RevealScope,
    *,
    photos: list[tuple[PydanticObjectId, str]] | None = None,
    attempts_left: int = 0,
    verification_available: bool = False,
) -> UserRead:
    """The only function permitted to turn a User into a response.

    Every route goes through here. Serializing a User anywhere else is a
    defect: it bypasses this gate and can leak the private tier.

    Media URLs are passed in rather than built here, so this module stays free
    of storage concerns and the caller presigns only when the scope allows it.
    """
    verification = target.private.verification
    profile = PublicProfileRead(
        display_name=target.public.display_name,
        age=age_from_birth_year(target.public.birth_year),
        city=target.public.city,
        gender=target.public.gender,
        bio=target.public.bio,
        attributes=target.public.attributes,
        interests=target.public.interests,
        verified=verification.status is VerificationStatus.VERIFIED,
    )

    if scope is RevealScope.PUBLIC:
        return UserRead(
            id=target.oid,
            status=target.status,
            profile=profile,
            created_at=target.created_at,
        )

    identity = PrivateIdentityRead(
        real_name=target.private.real_name,
        photo_urls=[url for _, url in photos or []],
        socials=target.private.socials,
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
        )
        if scope is RevealScope.SELF
        else None
    )

    return UserRead(
        id=target.oid,
        status=target.status,
        profile=profile,
        identity=identity,
        account=account,
        phone=target.phone,
        created_at=target.created_at,
    )
