from datetime import UTC, datetime
from typing import Annotated, Any, ClassVar

import pymongo
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

from app.core.db import DOCUMENT_MODELS
from app.modules.users.schemas import (
    MatchingProfile,
    PrivateIdentity,
    PublicProfile,
    UserStatus,
)


class User(Document):
    """A user's two tiers live in one document.

    They are read together, share a lifecycle, and stay far below the 16 MB
    limit, so embedding is cheaper than a join — and it makes the visibility
    rule a projection rather than a second query.
    """

    # Annotated[...] rather than Indexed(str, unique=True): the callable form
    # builds a dynamic subclass that mypy --strict cannot follow.
    phone: Annotated[str, Indexed(unique=True)]
    status: UserStatus = UserStatus.PENDING_ONBOARDING
    public: PublicProfile
    private: PrivateIdentity = Field(default_factory=PrivateIdentity)
    matching: MatchingProfile = Field(default_factory=MatchingProfile)
    # Matching ranks recently active people higher; written by get_current_user.
    last_active_at: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @property
    def oid(self) -> PydanticObjectId:
        """The id, without Beanie's Optional.

        Document.id is Optional because an unsaved document has none. Every
        user reached through a route came from the database, so narrowing it
        here beats an assert at each call site.
        """
        if self.id is None:  # pragma: no cover - unsaved documents never reach a route
            raise RuntimeError("User has no id; it was never saved")
        return self.id

    class Settings:
        name = "users"
        # ClassVar because Beanie reads this as configuration, not as a field.
        indexes: ClassVar[list[Any]] = [
            "public.city",
            [("private.location", pymongo.GEOSPHERE)],
            [("status", pymongo.ASCENDING), ("_id", pymongo.DESCENDING)],
        ]


DOCUMENT_MODELS.append(User)
