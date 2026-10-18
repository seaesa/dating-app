from pydantic import BaseModel, Field


class MembershipPlanRead(BaseModel):
    code: str = Field(..., description="Mã gói định danh (vd: 49k, 99k)")
    name: str = Field(..., description="Tên gói hiển thị")
    description: str = Field(default="", description="Mô tả chi tiết")
    price: int = Field(..., description="Giá gói (VND)")
    original_price: int = Field(..., description="Giá gốc trước giảm (VND)")
    duration_days: int = Field(..., description="Thời hạn sử dụng (ngày)")
    features: list[str] = Field(default_factory=list, description="Danh sách quyền lợi")
    is_active: bool = Field(default=True, description="Trạng thái kích hoạt")
    is_popular: bool = Field(default=False, description="Đánh dấu gói phổ biến nhất")
    sort_order: int = Field(default=0, description="Thứ tự sắp xếp")


class MembershipConfigRead(BaseModel):
    free_mode_enabled: bool = Field(
        ..., description="Trạng thái chế độ dùng thử miễn phí toàn hệ thống"
    )
    plans: list[MembershipPlanRead] = Field(
        default_factory=list, description="Danh sách các gói hội viên"
    )
