from datetime import datetime
from typing import Any

from pydantic import Field

from app.core.schemas import BaseSchema
from app.modules.admin.models import AdminRole
from app.modules.payments.models import OrderStatus
from app.modules.users.schemas import UserStatus


class AdminLoginRequest(BaseSchema):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=128)


class AdminTokenResponse(BaseSchema):
    access_token: str
    # Not a secret: the OAuth 2.0 token type, which is literally "bearer".
    token_type: str = "bearer"  # noqa: S105
    expires_in: int


class AdminMeRead(BaseSchema):
    id: str
    username: str
    email: str
    role: AdminRole
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None = None


class AdminPlanCreate(BaseSchema):
    code: str = Field(min_length=2, max_length=20, pattern=r"^[a-zA-Z0-9_\-]+$")
    name: str = Field(min_length=1, max_length=100)
    description: str = ""
    price: int = Field(ge=0)
    original_price: int = Field(ge=0)
    duration_days: int = Field(gt=0)
    features: list[str] = Field(default_factory=list)
    is_active: bool = True
    is_popular: bool = False
    sort_order: int = 0


class AdminPlanUpdate(BaseSchema):
    name: str | None = None
    description: str | None = None
    price: int | None = Field(default=None, ge=0)
    original_price: int | None = Field(default=None, ge=0)
    duration_days: int | None = Field(default=None, gt=0)
    features: list[str] | None = None
    is_active: bool | None = None
    is_popular: bool | None = None
    sort_order: int | None = None


class AdminPlanRead(BaseSchema):
    id: str
    code: str
    name: str
    description: str = ""
    price: int
    original_price: int
    duration_days: int
    features: list[str] = Field(default_factory=list)
    is_active: bool = True
    is_popular: bool = False
    sort_order: int = 0
    created_at: datetime
    updated_at: datetime


class AdminSystemConfigRead(BaseSchema):
    free_mode_enabled: bool
    qr_ttl_minutes: int
    web2m_bank_name: str
    web2m_bank_number: str
    web2m_account_holder: str
    web2m_bank_password: str = ""
    web2m_bank_token: str = ""
    web2m_api_get_transaction: str = ""
    web2m_api_get_qr: str = ""
    support_zalo_url: str = ""
    updated_at: datetime
    updated_by: str | None = None


class AdminSystemConfigUpdate(BaseSchema):
    free_mode_enabled: bool | None = None
    qr_ttl_minutes: int | None = Field(default=None, ge=1, le=1440)
    web2m_bank_name: str | None = None
    web2m_bank_number: str | None = None
    web2m_account_holder: str | None = None
    web2m_bank_password: str | None = None
    web2m_bank_token: str | None = None
    web2m_api_get_transaction: str | None = None
    web2m_api_get_qr: str | None = None
    support_zalo_url: str | None = None


class AdminTestWeb2MRequest(BaseSchema):
    bank_name: str | None = None
    bank_number: str | None = None
    bank_password: str | None = None
    bank_token: str | None = None
    api_get_transaction: str | None = None


class AdminTestWeb2MResponse(BaseSchema):
    success: bool
    message: str
    transaction_count: int = 0
    details: dict[str, Any] | None = None


class AdminOrderRead(BaseSchema):
    id: str
    user_id: str
    user_display_name: str | None = None
    user_phone: str | None = None
    plan_code: str
    plan_name: str | None = None
    amount: int
    payment_code: str
    status: OrderStatus
    qr_url: str
    web2m_transaction_id: str | None = None
    paid_at: datetime | None = None
    expires_at: datetime
    created_at: datetime
    updated_at: datetime


class AdminOrderPage(BaseSchema):
    items: list[AdminOrderRead]
    total: int
    page: int
    limit: int
    total_pages: int


class AdminManualActivateRequest(BaseSchema):
    note: str = Field(
        min_length=1, max_length=500, description="Lý do duyệt đơn thủ công"
    )


class AdminDashboardStatsRead(BaseSchema):
    total_users: int
    active_vip_users: int
    total_revenue: int
    paid_orders_count: int
    conversion_rate: float


class AdminUserListItem(BaseSchema):
    id: str
    phone: str
    display_name: str
    gender: str | None = None
    age: int | None = None
    city: str | None = None
    is_vip: bool
    vip_expires_at: datetime | None = None
    created_at: datetime
    status: UserStatus
    is_active: bool


class AdminUserPage(BaseSchema):
    items: list[AdminUserListItem]
    total: int
    page: int
    limit: int
    total_pages: int


class AdminUserBanRequest(BaseSchema):
    reason: str = Field(
        min_length=1, max_length=500, description="Lý do khóa hoặc mở khóa tài khoản"
    )


class AdminAuditLogRead(BaseSchema):
    id: str
    admin_id: str
    admin_username: str
    action: str
    target_type: str
    target_id: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    ip_address: str | None = None
    created_at: datetime


class AdminAuditLogPage(BaseSchema):
    items: list[AdminAuditLogRead]
    total: int
    page: int
    limit: int
    total_pages: int
