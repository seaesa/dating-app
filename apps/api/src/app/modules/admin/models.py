from datetime import UTC, datetime
from enum import StrEnum
from typing import Annotated, Any, ClassVar

import pymongo
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

from app.core.db import DOCUMENT_MODELS


class AdminRole(StrEnum):
    SUPERADMIN = "superadmin"
    MODERATOR = "moderator"


class AdminUser(Document):
    """An internal admin operator with access to moderation and dashboard."""

    username: Annotated[str, Indexed(unique=True)]
    email: Annotated[str, Indexed(unique=True)]
    password_hash: str
    role: AdminRole = AdminRole.SUPERADMIN
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_login_at: datetime | None = None

    @property
    def oid(self) -> PydanticObjectId:
        """The id, without Beanie's Optional. See User.oid."""
        if self.id is None:
            raise RuntimeError("AdminUser has no id; it was never saved")
        return self.id

    class Settings:
        name = "admin_users"


class AdminAuditLog(Document):
    """Immutable audit trail of actions taken by administrators."""

    admin_id: PydanticObjectId
    admin_username: str
    action: str
    target_type: str
    target_id: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    ip_address: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @property
    def oid(self) -> PydanticObjectId:
        """The id, without Beanie's Optional. See User.oid."""
        if self.id is None:
            raise RuntimeError("AdminAuditLog has no id; it was never saved")
        return self.id

    class Settings:
        name = "admin_audit_logs"
        indexes: ClassVar[list[Any]] = [
            [("created_at", pymongo.DESCENDING)],
            [("admin_id", pymongo.ASCENDING)],
        ]


DOCUMENT_MODELS.append(AdminUser)
DOCUMENT_MODELS.append(AdminAuditLog)
