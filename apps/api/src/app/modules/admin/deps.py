from typing import Annotated, Any

from beanie import PydanticObjectId
from fastapi import Depends, Request
from fastapi.security import HTTPBearer

from app.core.deps import SettingsDep
from app.core.errors import ForbiddenError, UnauthorizedError
from app.modules.admin.models import AdminAuditLog, AdminUser
from app.modules.admin.security import decode_admin_token

admin_bearer_scheme = HTTPBearer(auto_error=False, scheme_name="adminBearerAuth")


def _bearer_token(request: Request) -> str | None:
    header = request.headers.get("Authorization")
    if not header or not header.lower().startswith("bearer "):
        return None
    return header[7:].strip() or None


async def get_current_admin(
    request: Request,
    settings: SettingsDep,
    _scheme: Annotated[object, Depends(admin_bearer_scheme)] = None,
) -> AdminUser:
    token = _bearer_token(request)
    if token is None:
        raise UnauthorizedError(detail="Yêu cầu đăng nhập tài khoản quản trị.")

    payload = decode_admin_token(token, settings)
    sub = payload.get("sub")
    if not sub:
        raise UnauthorizedError(detail="Token quản trị không hợp lệ.")

    try:
        admin_oid = PydanticObjectId(sub)
    except Exception as exc:
        raise UnauthorizedError(detail="ID quản trị trong token không hợp lệ.") from exc

    admin = await AdminUser.get(admin_oid)
    if admin is None:
        raise UnauthorizedError(detail="Tài khoản quản trị không tồn tại.")

    if not admin.is_active:
        raise ForbiddenError(detail="Tài khoản quản trị đã bị vô hiệu hóa.")

    return admin


CurrentAdmin = Annotated[AdminUser, Depends(get_current_admin)]


async def log_admin_action(
    admin: AdminUser,
    action: str,
    target_type: str,
    target_id: str | None = None,
    details: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> AdminAuditLog:
    """Record an audit trail entry for an administrative action."""
    log_entry = AdminAuditLog(
        admin_id=admin.oid,
        admin_username=admin.username,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details or {},
        ip_address=ip_address,
    )
    await log_entry.insert()
    return log_entry
