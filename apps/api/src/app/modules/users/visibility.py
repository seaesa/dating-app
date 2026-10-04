from enum import StrEnum

from app.core.age import age_from_birth_year
from app.modules.users.models import User
from app.modules.users.schemas import (
    PrivateIdentityRead,
    PublicProfileRead,
    UserRead,
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
    avatar_url: str | None = None,
    photo_urls: list[str] | None = None,
) -> UserRead:
    """The only function permitted to turn a User into a response.

    Every route goes through here. Serializing a User anywhere else is a
    defect: it bypasses this gate and can leak the private tier.

    Media URLs are passed in rather than built here, so this module stays free
    of storage concerns and the caller presigns only when the scope allows it.
    """
    profile = PublicProfileRead(
        nickname=target.public.nickname,
        age=age_from_birth_year(target.public.birth_year),
        city=target.public.city,
        gender=getattr(target.public, "gender", None),
        bio=target.public.bio,
        interests=target.public.interests,
        avatar_url=avatar_url,
    )

    if scope is RevealScope.PUBLIC:
        return UserRead(
            id=target.oid,
            status=target.status,
            profile=profile,
            identity=None,
            phone=None,
            created_at=target.created_at,
        )

    return UserRead(
        id=target.oid,
        status=target.status,
        profile=profile,
        identity=PrivateIdentityRead(
            real_name=target.private.real_name,
            photo_urls=photo_urls or [],
            socials=target.private.socials,
            location=target.private.location,
        ),
        phone=target.phone,
        created_at=target.created_at,
    )
