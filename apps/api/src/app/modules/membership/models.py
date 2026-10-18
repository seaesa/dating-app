from datetime import UTC, datetime
from typing import Annotated, Any, ClassVar

import pymongo
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

from app.core.db import DOCUMENT_MODELS


class MembershipPlan(Document):
    """A subscription tier available for purchase, e.g. 49k, 99k."""

    code: Annotated[str, Indexed(unique=True)]  # "49k", "99k"
    name: str  # "Gói VIP Cơ Bản", "Gói VIP Toàn Diện"
    description: str = ""
    price: int  # 49000, 99000
    original_price: int  # 99000, 199000
    duration_days: int  # 30, 90
    features: list[str] = Field(default_factory=list)
    is_active: bool = True
    is_popular: bool = False
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @property
    def oid(self) -> PydanticObjectId:
        """The id, without Beanie's Optional. See User.oid."""
        if self.id is None:
            raise RuntimeError("MembershipPlan has no id; it was never saved")
        return self.id

    class Settings:
        name = "membership_plans"
        indexes: ClassVar[list[Any]] = [
            [("sort_order", pymongo.ASCENDING)],
            [("is_active", pymongo.ASCENDING)],
        ]


DOCUMENT_MODELS.append(MembershipPlan)
