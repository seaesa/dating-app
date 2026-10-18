from datetime import UTC, datetime
from enum import StrEnum
from typing import Annotated, Any, ClassVar

import pymongo
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

from app.core.db import DOCUMENT_MODELS


class OrderStatus(StrEnum):
    PENDING = "pending"
    PAID = "paid"
    EXPIRED = "expired"
    MANUAL_PAID = "manual_paid"
    CANCELLED = "cancelled"


class Order(Document):
    """A top-up order generated for a user subscribing via Web2M (VietQR)."""

    user_id: Annotated[PydanticObjectId, Indexed()]
    plan_code: str
    amount: int
    payment_code: Annotated[str, Indexed(unique=True)]  # TDxxxxxx
    status: OrderStatus = OrderStatus.PENDING
    qr_url: str
    web2m_transaction_id: str | None = None
    paid_at: datetime | None = None
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @property
    def oid(self) -> PydanticObjectId:
        """The id, without Beanie's Optional. See User.oid."""
        if self.id is None:
            raise RuntimeError("Order has no id; it was never saved")
        return self.id

    class Settings:
        name = "orders"
        indexes: ClassVar[list[Any]] = [
            [("user_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)],
            [("status", pymongo.ASCENDING)],
        ]


DOCUMENT_MODELS.append(Order)
