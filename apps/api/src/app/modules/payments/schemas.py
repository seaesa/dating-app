from datetime import datetime

from pydantic import BaseModel, Field

from app.modules.payments.models import OrderStatus


class OrderCreate(BaseModel):
    plan_code: str = Field(..., description="Mã gói hội viên cần mua (vd: 49k, 99k)")


class OrderRead(BaseModel):
    id: str = Field(..., description="ID đơn hàng")
    user_id: str = Field(..., description="ID người dùng")
    plan_code: str = Field(..., description="Mã gói")
    amount: int = Field(..., description="Số tiền thanh toán")
    payment_code: str = Field(..., description="Mã chuyển khoản (TDxxxxxx)")
    status: OrderStatus = Field(..., description="Trạng thái đơn hàng")
    qr_url: str = Field(..., description="Link ảnh VietQR QuickLink")
    web2m_transaction_id: str | None = Field(default=None)
    expires_at: datetime
    created_at: datetime
    paid_at: datetime | None = None


class OrderStatusRead(BaseModel):
    order_id: str = Field(..., description="ID đơn hàng")
    paid: bool = Field(..., description="Đã thanh toán thành công chưa")
    status: OrderStatus = Field(..., description="Trạng thái đơn hàng hiện tại")
    expires_at: datetime
    paid_at: datetime | None = None
    membership_expires_at: datetime | None = Field(
        default=None,
        description="Thời hạn hội viên mới sau khi kích hoạt thành công",
    )
