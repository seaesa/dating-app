from datetime import UTC, datetime
from typing import Any

from beanie import PydanticObjectId
from fastapi import APIRouter, Query, Request

from app.core.deps import SettingsDep
from app.core.errors import ConflictError, NotFoundError, UnauthorizedError
from app.core.schemas import Message
from app.modules.admin.deps import CurrentAdmin, log_admin_action
from app.modules.admin.models import AdminAuditLog, AdminUser
from app.modules.admin.schemas import (
    AdminAuditLogPage,
    AdminAuditLogRead,
    AdminDashboardStatsRead,
    AdminLoginRequest,
    AdminManualActivateRequest,
    AdminMeRead,
    AdminOrderPage,
    AdminOrderRead,
    AdminPlanCreate,
    AdminPlanRead,
    AdminPlanUpdate,
    AdminSystemConfigRead,
    AdminSystemConfigUpdate,
    AdminTokenResponse,
    AdminUserBanRequest,
    AdminUserListItem,
    AdminUserPage,
)
from app.modules.admin.security import (
    create_admin_token,
    verify_password,
)
from app.modules.membership.models import MembershipPlan
from app.modules.payments.models import Order, OrderStatus
from app.modules.payments.service import PaymentService
from app.modules.system_config.models import SystemConfig
from app.modules.users.models import User
from app.modules.users.schemas import UserStatus

router = APIRouter(prefix="/admin")


def _build_admin_order_read(
    order: Order,
    user: User | None = None,
    plan: MembershipPlan | None = None,
) -> AdminOrderRead:
    return AdminOrderRead(
        id=str(order.oid),
        user_id=str(order.user_id),
        user_display_name=user.public.display_name if user else None,
        user_phone=user.phone if user else None,
        plan_code=order.plan_code,
        plan_name=plan.name if plan else None,
        amount=order.amount,
        payment_code=order.payment_code,
        status=order.status,
        qr_url=order.qr_url,
        web2m_transaction_id=order.web2m_transaction_id,
        paid_at=order.paid_at,
        expires_at=order.expires_at,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


# --- Admin Auth ---


@router.post(
    "/auth/login",
    response_model=AdminTokenResponse,
    tags=["Admin Auth"],
    operation_id="adminLogin",
)
async def admin_login(
    body: AdminLoginRequest,
    request: Request,
    settings: SettingsDep,
) -> AdminTokenResponse:
    admin = await AdminUser.find_one({"username": body.username})
    if admin is None or not verify_password(body.password, admin.password_hash):
        raise UnauthorizedError(detail="Tên đăng nhập hoặc mật khẩu không chính xác.")

    if not admin.is_active:
        raise UnauthorizedError(detail="Tài khoản quản trị đã bị vô hiệu hóa.")

    admin.last_login_at = datetime.now(UTC)
    await admin.save()

    ip = request.client.host if request.client else None
    await log_admin_action(
        admin=admin,
        action="login",
        target_type="admin_auth",
        target_id=str(admin.oid),
        details={"username": admin.username},
        ip_address=ip,
    )

    token, expires_in = create_admin_token(admin, settings)
    return AdminTokenResponse(
        access_token=token,
        expires_in=expires_in,
    )


@router.get(
    "/auth/me",
    response_model=AdminMeRead,
    tags=["Admin Auth"],
    operation_id="getAdminMe",
)
async def get_admin_me(admin: CurrentAdmin) -> AdminMeRead:
    return AdminMeRead(
        id=str(admin.oid),
        username=admin.username,
        email=admin.email,
        role=admin.role,
        is_active=admin.is_active,
        created_at=admin.created_at,
        last_login_at=admin.last_login_at,
    )


# --- Admin Membership Plans ---


@router.get(
    "/membership/plans",
    response_model=list[AdminPlanRead],
    tags=["Admin Membership"],
    operation_id="getAdminPlans",
)
async def get_admin_plans(_: CurrentAdmin) -> list[AdminPlanRead]:
    plans = await MembershipPlan.find().sort("sort_order").to_list()
    return [
        AdminPlanRead(
            id=str(p.oid),
            code=p.code,
            name=p.name,
            description=p.description,
            price=p.price,
            original_price=p.original_price,
            duration_days=p.duration_days,
            features=p.features,
            is_active=p.is_active,
            is_popular=p.is_popular,
            sort_order=p.sort_order,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in plans
    ]


@router.post(
    "/membership/plans",
    response_model=AdminPlanRead,
    status_code=201,
    tags=["Admin Membership"],
    operation_id="createAdminPlan",
)
async def create_admin_plan(
    body: AdminPlanCreate,
    admin: CurrentAdmin,
    request: Request,
) -> AdminPlanRead:
    existing = await MembershipPlan.find_one({"code": body.code})
    if existing is not None:
        raise ConflictError(detail=f"Mã gói hội viên '{body.code}' đã tồn tại.")

    now = datetime.now(UTC)
    plan = MembershipPlan(
        code=body.code,
        name=body.name,
        description=body.description,
        price=body.price,
        original_price=body.original_price,
        duration_days=body.duration_days,
        features=body.features,
        is_active=body.is_active,
        is_popular=body.is_popular,
        sort_order=body.sort_order,
        created_at=now,
        updated_at=now,
    )
    await plan.insert()

    ip = request.client.host if request.client else None
    await log_admin_action(
        admin=admin,
        action="create_membership_plan",
        target_type="membership_plan",
        target_id=plan.code,
        details=body.model_dump(),
        ip_address=ip,
    )

    return AdminPlanRead(
        id=str(plan.oid),
        code=plan.code,
        name=plan.name,
        description=plan.description,
        price=plan.price,
        original_price=plan.original_price,
        duration_days=plan.duration_days,
        features=plan.features,
        is_active=plan.is_active,
        is_popular=plan.is_popular,
        sort_order=plan.sort_order,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


@router.put(
    "/membership/plans/{code}",
    response_model=AdminPlanRead,
    tags=["Admin Membership"],
    operation_id="updateAdminPlan",
)
async def update_admin_plan(
    code: str,
    body: AdminPlanUpdate,
    admin: CurrentAdmin,
    request: Request,
) -> AdminPlanRead:
    plan = await MembershipPlan.find_one({"code": code})
    if plan is None:
        raise NotFoundError(detail=f"Không tìm thấy gói hội viên '{code}'.")

    update_data = body.model_dump(exclude_unset=True, by_alias=False)
    if update_data:
        for field, value in update_data.items():
            setattr(plan, field, value)
        plan.updated_at = datetime.now(UTC)
        await plan.save()

        ip = request.client.host if request.client else None
        await log_admin_action(
            admin=admin,
            action="update_membership_plan",
            target_type="membership_plan",
            target_id=plan.code,
            details=update_data,
            ip_address=ip,
        )

    return AdminPlanRead(
        id=str(plan.oid),
        code=plan.code,
        name=plan.name,
        description=plan.description,
        price=plan.price,
        original_price=plan.original_price,
        duration_days=plan.duration_days,
        features=plan.features,
        is_active=plan.is_active,
        is_popular=plan.is_popular,
        sort_order=plan.sort_order,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


@router.delete(
    "/membership/plans/{code}",
    response_model=Message,
    tags=["Admin Membership"],
    operation_id="deleteAdminPlan",
)
async def delete_admin_plan(
    code: str,
    admin: CurrentAdmin,
    request: Request,
    hard_delete: bool = Query(default=False),
) -> Message:
    plan = await MembershipPlan.find_one({"code": code})
    if plan is None:
        raise NotFoundError(detail=f"Không tìm thấy gói hội viên '{code}'.")

    ip = request.client.host if request.client else None
    if hard_delete:
        await plan.delete()
        await log_admin_action(
            admin=admin,
            action="delete_membership_plan_permanent",
            target_type="membership_plan",
            target_id=code,
            details={"code": code},
            ip_address=ip,
        )
        return Message(message=f"Đã xóa vĩnh viễn gói hội viên '{code}'.")

    plan.is_active = False
    plan.updated_at = datetime.now(UTC)
    await plan.save()

    await log_admin_action(
        admin=admin,
        action="deactivate_membership_plan",
        target_type="membership_plan",
        target_id=code,
        details={"is_active": False},
        ip_address=ip,
    )
    return Message(message=f"Đã vô hiệu hóa gói hội viên '{code}'.")


# --- Admin System Config ---


@router.get(
    "/system-config",
    response_model=AdminSystemConfigRead,
    tags=["Admin System Config"],
    operation_id="getAdminSystemConfig",
)
async def get_admin_system_config(_: CurrentAdmin) -> AdminSystemConfigRead:
    config = await SystemConfig.find_one()
    if config is None:
        config = SystemConfig()
        await config.insert()

    return AdminSystemConfigRead(
        free_mode_enabled=config.free_mode_enabled,
        qr_ttl_minutes=config.qr_ttl_minutes,
        web2m_bank_name=config.web2m_bank_name,
        web2m_bank_number=config.web2m_bank_number,
        web2m_account_holder=config.web2m_account_holder,
        support_zalo_url=config.support_zalo_url,
        updated_at=config.updated_at,
        updated_by=config.updated_by,
    )


@router.put(
    "/system-config",
    response_model=AdminSystemConfigRead,
    tags=["Admin System Config"],
    operation_id="updateAdminSystemConfig",
)
async def update_admin_system_config(
    body: AdminSystemConfigUpdate,
    admin: CurrentAdmin,
    request: Request,
) -> AdminSystemConfigRead:
    config = await SystemConfig.find_one()
    if config is None:
        config = SystemConfig()

    update_data = body.model_dump(exclude_unset=True, by_alias=False)
    for field, value in update_data.items():
        setattr(config, field, value)

    config.updated_at = datetime.now(UTC)
    config.updated_by = admin.username
    await config.save()

    ip = request.client.host if request.client else None
    await log_admin_action(
        admin=admin,
        action="update_system_config",
        target_type="system_config",
        details=update_data,
        ip_address=ip,
    )

    return AdminSystemConfigRead(
        free_mode_enabled=config.free_mode_enabled,
        qr_ttl_minutes=config.qr_ttl_minutes,
        web2m_bank_name=config.web2m_bank_name,
        web2m_bank_number=config.web2m_bank_number,
        web2m_account_holder=config.web2m_account_holder,
        support_zalo_url=config.support_zalo_url,
        updated_at=config.updated_at,
        updated_by=config.updated_by,
    )


# --- Admin Orders ---


@router.get(
    "/orders",
    response_model=AdminOrderPage,
    tags=["Admin Orders"],
    operation_id="getAdminOrders",
)
async def get_admin_orders(
    _: CurrentAdmin,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    status: OrderStatus | None = Query(default=None),
    payment_code: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
) -> AdminOrderPage:
    query_filter: dict[str, Any] = {}
    if status is not None:
        query_filter["status"] = status
    if payment_code:
        query_filter["payment_code"] = {
            "$regex": payment_code.strip(),
            "$options": "i",
        }
    if user_id:
        try:
            query_filter["user_id"] = PydanticObjectId(user_id)
        except Exception:
            return AdminOrderPage(
                items=[],
                total=0,
                page=page,
                limit=limit,
                total_pages=0,
            )

    total = await Order.find(query_filter).count()
    skip = (page - 1) * limit
    orders = (
        await Order.find(query_filter)
        .sort("-created_at")
        .skip(skip)
        .limit(limit)
        .to_list()
    )

    user_ids = list({o.user_id for o in orders})
    users = await User.find({"_id": {"$in": user_ids}}).to_list()
    users_by_id = {u.oid: u for u in users}

    plans = await MembershipPlan.find().to_list()
    plans_by_code = {p.code: p for p in plans}

    items = [
        _build_admin_order_read(
            order=o,
            user=users_by_id.get(o.user_id),
            plan=plans_by_code.get(o.plan_code),
        )
        for o in orders
    ]

    total_pages = (total + limit - 1) // limit if total > 0 else 0
    return AdminOrderPage(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get(
    "/orders/{order_id}",
    response_model=AdminOrderRead,
    tags=["Admin Orders"],
    operation_id="getAdminOrderDetail",
)
async def get_admin_order_detail(
    order_id: str,
    _: CurrentAdmin,
) -> AdminOrderRead:
    try:
        oid = PydanticObjectId(order_id)
    except Exception as exc:
        raise NotFoundError(detail=f"Đơn hàng '{order_id}' không tồn tại.") from exc

    order = await Order.get(oid)
    if order is None:
        raise NotFoundError(detail=f"Đơn hàng '{order_id}' không tồn tại.")

    user = await User.get(order.user_id)
    plan = await MembershipPlan.find_one({"code": order.plan_code})

    return _build_admin_order_read(order, user, plan)


@router.post(
    "/orders/{order_id}/manual-activate",
    response_model=AdminOrderRead,
    tags=["Admin Orders"],
    operation_id="manualActivateOrder",
)
async def manual_activate_order(
    order_id: str,
    body: AdminManualActivateRequest,
    admin: CurrentAdmin,
    settings: SettingsDep,
) -> AdminOrderRead:
    try:
        oid = PydanticObjectId(order_id)
    except Exception as exc:
        raise NotFoundError(detail=f"Đơn hàng '{order_id}' không tồn tại.") from exc

    order = await Order.get(oid)
    if order is None:
        raise NotFoundError(detail=f"Đơn hàng '{order_id}' không tồn tại.")

    service = PaymentService(settings)
    updated_order = await service.force_pay_order(
        order_id=oid,
        admin_id=admin.oid,
        admin_username=admin.username,
        note=body.note,
    )

    user = await User.get(updated_order.user_id)
    plan = await MembershipPlan.find_one({"code": updated_order.plan_code})

    return _build_admin_order_read(updated_order, user, plan)


# --- Admin Dashboard & Users Moderation & Audit Logs ---


@router.get(
    "/dashboard/stats",
    response_model=AdminDashboardStatsRead,
    tags=["Admin Dashboard"],
    operation_id="getAdminDashboardStats",
)
async def get_admin_dashboard_stats(
    _: CurrentAdmin,
) -> AdminDashboardStatsRead:
    now = datetime.now(UTC)
    total_users = await User.find().count()
    active_vip_users = await User.find(
        {"membership.is_active": True, "membership.expires_at": {"$gt": now}}
    ).count()

    orders_pipeline: list[dict[str, Any]] = [
        {"$match": {"status": {"$in": [OrderStatus.PAID, OrderStatus.MANUAL_PAID]}}},
        {
            "$group": {
                "_id": None,
                "total_revenue": {"$sum": "$amount"},
                "paid_orders_count": {"$sum": 1},
            }
        },
    ]
    agg_result = await Order.aggregate(orders_pipeline).to_list()
    total_revenue = int(agg_result[0].get("total_revenue", 0)) if agg_result else 0
    paid_orders_count = (
        int(agg_result[0].get("paid_orders_count", 0)) if agg_result else 0
    )
    conversion_rate = (
        round((active_vip_users / total_users * 100), 2) if total_users > 0 else 0.0
    )

    return AdminDashboardStatsRead(
        total_users=total_users,
        active_vip_users=active_vip_users,
        total_revenue=total_revenue,
        paid_orders_count=paid_orders_count,
        conversion_rate=conversion_rate,
    )


@router.get(
    "/users",
    response_model=AdminUserPage,
    tags=["Admin Users"],
    operation_id="getAdminUsers",
)
async def get_admin_users(
    _: CurrentAdmin,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    is_vip: bool | None = Query(default=None),
    status: UserStatus | None = Query(default=None),
) -> AdminUserPage:
    now = datetime.now(UTC)
    query_filter: dict[str, Any] = {}
    if status is not None:
        query_filter["status"] = status

    if is_vip is True:
        query_filter["membership.is_active"] = True
        query_filter["membership.expires_at"] = {"$gt": now}
    elif is_vip is False:
        query_filter["$or"] = [
            {"membership.is_active": False},
            {"membership.expires_at": {"$lte": now}},
            {"membership.expires_at": None},
        ]

    if search:
        clean = search.strip()
        search_conditions: list[dict[str, Any]] = [
            {"phone": {"$regex": clean, "$options": "i"}},
            {"public.display_name": {"$regex": clean, "$options": "i"}},
        ]
        if "$or" in query_filter:
            query_filter = {"$and": [query_filter, {"$or": search_conditions}]}
        else:
            query_filter["$or"] = search_conditions

    total = await User.find(query_filter).count()
    skip = (page - 1) * limit
    users = (
        await User.find(query_filter)
        .sort("-created_at")
        .skip(skip)
        .limit(limit)
        .to_list()
    )

    current_year = now.year
    items = [
        AdminUserListItem(
            id=str(u.oid),
            phone=u.phone,
            display_name=u.public.display_name,
            gender=str(u.public.gender) if u.public.gender else None,
            age=(current_year - u.public.birth_year) if u.public.birth_year else None,
            city=u.public.city,
            is_vip=bool(
                u.membership.is_active
                and u.membership.expires_at
                and u.membership.expires_at > now
            ),
            vip_expires_at=u.membership.expires_at,
            created_at=u.created_at,
            status=u.status,
            is_active=(u.status == UserStatus.ACTIVE),
        )
        for u in users
    ]
    total_pages = (total + limit - 1) // limit if total > 0 else 0
    return AdminUserPage(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.post(
    "/users/{user_id}/ban",
    response_model=AdminUserListItem,
    tags=["Admin Users"],
    operation_id="banAdminUser",
)
async def ban_admin_user(
    user_id: str,
    body: AdminUserBanRequest,
    admin: CurrentAdmin,
    request: Request,
) -> AdminUserListItem:
    try:
        oid = PydanticObjectId(user_id)
    except Exception as exc:
        raise NotFoundError(detail=f"Người dùng '{user_id}' không tồn tại.") from exc

    user = await User.get(oid)
    if user is None:
        raise NotFoundError(detail=f"Người dùng '{user_id}' không tồn tại.")

    if user.status == UserStatus.SUSPENDED:
        user.status = UserStatus.ACTIVE
        action = "unban_user"
    else:
        user.status = UserStatus.SUSPENDED
        action = "ban_user"

    now = datetime.now(UTC)
    user.updated_at = now
    await user.save()

    ip = request.client.host if request.client else None
    await log_admin_action(
        admin=admin,
        action=action,
        target_type="user",
        target_id=str(user.oid),
        details={"reason": body.reason, "new_status": str(user.status)},
        ip_address=ip,
    )

    current_year = now.year
    return AdminUserListItem(
        id=str(user.oid),
        phone=user.phone,
        display_name=user.public.display_name,
        gender=str(user.public.gender) if user.public.gender else None,
        age=(current_year - user.public.birth_year) if user.public.birth_year else None,
        city=user.public.city,
        is_vip=bool(
            user.membership.is_active
            and user.membership.expires_at
            and user.membership.expires_at > now
        ),
        vip_expires_at=user.membership.expires_at,
        created_at=user.created_at,
        status=user.status,
        is_active=(user.status == UserStatus.ACTIVE),
    )


@router.get(
    "/audit-logs",
    response_model=AdminAuditLogPage,
    tags=["Admin Audit Logs"],
    operation_id="getAdminAuditLogs",
)
async def get_admin_audit_logs(
    _: CurrentAdmin,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    admin_id: str | None = Query(default=None),
    action: str | None = Query(default=None),
    target_type: str | None = Query(default=None),
) -> AdminAuditLogPage:
    query_filter: dict[str, Any] = {}
    if admin_id:
        try:
            query_filter["admin_id"] = PydanticObjectId(admin_id)
        except Exception:
            return AdminAuditLogPage(
                items=[],
                total=0,
                page=page,
                limit=limit,
                total_pages=0,
            )
    if action:
        query_filter["action"] = action
    if target_type:
        query_filter["target_type"] = target_type

    total = await AdminAuditLog.find(query_filter).count()
    skip = (page - 1) * limit
    logs = (
        await AdminAuditLog.find(query_filter)
        .sort("-created_at")
        .skip(skip)
        .limit(limit)
        .to_list()
    )

    items = [
        AdminAuditLogRead(
            id=str(log.oid),
            admin_id=str(log.admin_id),
            admin_username=log.admin_username,
            action=log.action,
            target_type=log.target_type,
            target_id=log.target_id,
            details=log.details,
            ip_address=log.ip_address,
            created_at=log.created_at,
        )
        for log in logs
    ]
    total_pages = (total + limit - 1) // limit if total > 0 else 0
    return AdminAuditLogPage(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )
