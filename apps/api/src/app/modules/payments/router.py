from typing import Annotated

from beanie import PydanticObjectId
from fastapi import APIRouter, Path, status

from app.core.deps import CurrentUser
from app.core.errors import ForbiddenError, NotFoundError
from app.modules.payments.models import Order
from app.modules.payments.schemas import OrderCreate, OrderRead, OrderStatusRead
from app.modules.payments.service import PaymentService
from app.modules.users.models import User

router = APIRouter(prefix="/orders", tags=["payments"])


@router.post(
    "",
    response_model=OrderRead,
    status_code=status.HTTP_201_CREATED,
    operation_id="createOrder",
)
async def create_order(
    body: OrderCreate,
    user: CurrentUser,
) -> OrderRead:
    """Create a new payment order or return active pending one.

    Reuses existing pending order if created within the last 10 minutes.
    """
    service = PaymentService()
    order, _ = await service.create_order(user.oid, body.plan_code)
    return OrderRead(
        id=str(order.oid),
        user_id=str(order.user_id),
        plan_code=order.plan_code,
        amount=order.amount,
        payment_code=order.payment_code,
        status=order.status,
        qr_url=order.qr_url,
        web2m_transaction_id=order.web2m_transaction_id,
        expires_at=order.expires_at,
        created_at=order.created_at,
        paid_at=order.paid_at,
    )


@router.get(
    "/{order_id}",
    response_model=OrderRead,
    operation_id="getOrder",
)
async def get_order(
    order_id: Annotated[str, Path(description="ID của đơn hàng")],
    user: CurrentUser,
) -> OrderRead:
    """Get details of a specific payment order."""
    try:
        oid = PydanticObjectId(order_id)
    except Exception:
        raise NotFoundError(detail="Đơn hàng không hợp lệ.") from None

    order = await Order.get(oid)
    if order is None:
        raise NotFoundError(detail="Đơn hàng không tồn tại.")

    if order.user_id != user.oid:
        raise ForbiddenError(detail="Bạn không có quyền xem đơn hàng này.")

    return OrderRead(
        id=str(order.oid),
        user_id=str(order.user_id),
        plan_code=order.plan_code,
        amount=order.amount,
        payment_code=order.payment_code,
        status=order.status,
        qr_url=order.qr_url,
        web2m_transaction_id=order.web2m_transaction_id,
        expires_at=order.expires_at,
        created_at=order.created_at,
        paid_at=order.paid_at,
    )


@router.get(
    "/{order_id}/status",
    response_model=OrderStatusRead,
    operation_id="getOrderStatus",
)
async def get_order_status(
    order_id: Annotated[str, Path(description="ID của đơn hàng")],
    user: CurrentUser,
) -> OrderStatusRead:
    """Poll order payment status, reconciling with Web2M.

    Activates user membership automatically when payment matches.
    """
    try:
        oid = PydanticObjectId(order_id)
    except Exception:
        raise NotFoundError(detail="Đơn hàng không hợp lệ.") from None

    order = await Order.get(oid)
    if order is None:
        raise NotFoundError(detail="Đơn hàng không tồn tại.")

    if order.user_id != user.oid:
        raise ForbiddenError(detail="Bạn không có quyền xem đơn hàng này.")

    service = PaymentService()
    paid, updated_order = await service.check_and_update_order(oid)

    membership_expires_at = None
    if paid:
        refreshed_user = await User.get(user.oid)
        if (
            refreshed_user
            and refreshed_user.membership.is_active
            and refreshed_user.membership.expires_at
        ):
            membership_expires_at = refreshed_user.membership.expires_at

    return OrderStatusRead(
        order_id=str(updated_order.oid),
        paid=paid,
        status=updated_order.status,
        expires_at=updated_order.expires_at,
        paid_at=updated_order.paid_at,
        membership_expires_at=membership_expires_at,
    )
