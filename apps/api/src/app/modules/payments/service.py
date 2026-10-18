import contextlib
import secrets
import urllib.parse
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from beanie import PydanticObjectId

from app.core.config import Settings, get_settings
from app.core.errors import BadRequestError, NotFoundError
from app.core.logging import get_logger
from app.modules.admin.models import AdminAuditLog
from app.modules.membership.models import MembershipPlan
from app.modules.payments.models import Order, OrderStatus
from app.modules.system_config.models import SystemConfig
from app.modules.users.models import User

log = get_logger(__name__)


class PaymentService:
    """Handles Web2M VietQR order creation, bank polling, and VIP activation."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def generate_payment_code(self) -> str:
        """Generate a unique transfer code starting with 'TD', e.g. TD839201."""
        for _ in range(50):
            # 6-digit random number
            code = f"TD{secrets.randbelow(900000) + 100000}"
            existing = await Order.find_one({"payment_code": code})
            if existing is None:
                return code
        raise RuntimeError(
            "Failed to generate a unique payment code after multiple attempts"
        )

    async def get_payment_bank_config(self) -> dict[str, str]:
        """Fetch bank credentials prioritizing SystemConfig over Settings."""
        sys_config = None
        with contextlib.suppress(Exception):
            sys_config = await SystemConfig.find_one()

        bank_name = (
            (
                sys_config.web2m_bank_name
                if sys_config and sys_config.web2m_bank_name
                else None
            )
            or self.settings.web2m_bank_name
            or "MBBank"
        )
        bank_number = (
            sys_config.web2m_bank_number
            if sys_config and sys_config.web2m_bank_number
            else None
        ) or self.settings.web2m_bank_number
        account_holder = (
            sys_config.web2m_account_holder
            if sys_config and sys_config.web2m_account_holder
            else None
        ) or self.settings.web2m_account_holder
        return {
            "bank_name": bank_name,
            "bank_number": bank_number,
            "account_holder": account_holder,
        }

    async def generate_qr_url(self, amount: int, payment_code: str) -> str:
        """Construct VietQR QuickLink image URL via Web2M."""
        cfg = await self.get_payment_bank_config()
        api_get_qr = self.settings.web2m_api_get_qr.rstrip("/")
        encoded_holder = urllib.parse.quote(cfg["account_holder"])
        params = urllib.parse.urlencode(
            {
                "amount": str(amount),
                "memo": payment_code,
                "is_mask": self.settings.web2m_is_mask,
                "bg": self.settings.web2m_bank_background,
            }
        )
        bank_name = cfg["bank_name"]
        bank_num = cfg["bank_number"]
        return f"{api_get_qr}/{bank_name}/{bank_num}/{encoded_holder}?{params}"

    async def fetch_web2m_transactions(self) -> list[dict[str, Any]]:
        """Fetch recent bank transactions from Web2M API."""
        cfg = await self.get_payment_bank_config()
        bank_password = self.settings.web2m_bank_password
        bank_number = cfg["bank_number"]
        bank_token = self.settings.web2m_bank_token

        if not (bank_password and bank_number and bank_token):
            log.warning("web2m.credentials_missing", has_number=bool(bank_number))
            return []

        api_url = (
            f"{self.settings.web2m_api_get_transaction.rstrip('/')}/"
            f"{bank_password}/{bank_number}/{bank_token}"
        )

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(api_url)
                if res.status_code == 200:
                    data = res.json()
                    transactions: list[dict[str, Any]] = data.get("transactions", [])
                    return transactions
                log.warning("web2m.fetch_failed", status=res.status_code)
                return []
        except Exception as exc:
            log.warning("web2m.network_error", error=str(exc))
            return []

    async def create_order(
        self, user_id: PydanticObjectId, plan_code: str
    ) -> tuple[Order, str]:
        """Create a new payment order or reuse an active pending one (< 10 minutes)."""
        plan = await MembershipPlan.find_one({"code": plan_code, "is_active": True})
        if plan is None:
            raise BadRequestError(
                detail=f"Gói dịch vụ '{plan_code}' không tồn tại hoặc đã ngừng cung cấp."
            )

        now = datetime.now(UTC)
        reuse_cutoff = now - timedelta(minutes=10)

        # Check for existing pending order to avoid creating duplicate QR codes
        existing = await Order.find_one(
            {
                "user_id": user_id,
                "plan_code": plan_code,
                "status": OrderStatus.PENDING,
                "created_at": {"$gte": reuse_cutoff},
            }
        )
        if existing is not None:
            return existing, existing.qr_url

        payment_code = await self.generate_payment_code()
        qr_url = await self.generate_qr_url(plan.price, payment_code)
        expires_at = now + timedelta(minutes=self.settings.web2m_qr_ttl_minutes)

        order = Order(
            user_id=user_id,
            plan_code=plan.code,
            amount=plan.price,
            payment_code=payment_code,
            status=OrderStatus.PENDING,
            qr_url=qr_url,
            expires_at=expires_at,
        )
        await order.insert()
        log.info(
            "order.created",
            order_id=str(order.oid),
            user_id=str(user_id),
            code=payment_code,
        )
        return order, qr_url

    async def check_and_update_order(
        self, order_id: PydanticObjectId
    ) -> tuple[bool, Order]:
        """Check order against recent Web2M transactions, activating VIP on match."""
        order = await Order.get(order_id)
        if order is None:
            raise NotFoundError(detail="Đơn hàng không tồn tại.")

        if order.status in (OrderStatus.PAID, OrderStatus.MANUAL_PAID):
            return True, order

        if order.status in (OrderStatus.CANCELLED, OrderStatus.EXPIRED):
            return False, order

        now = datetime.now(UTC)
        if now > order.expires_at:
            order.status = OrderStatus.EXPIRED
            order.updated_at = now
            await order.save()
            return False, order

        transactions = await self.fetch_web2m_transactions()
        matched_tx: dict[str, Any] | None = None

        for tx in transactions:
            tx_type = tx.get("type")
            tx_desc = str(tx.get("description", "")).upper()
            try:
                tx_amount = float(tx.get("amount", 0))
            except (ValueError, TypeError):
                continue

            if (
                tx_type == "IN"
                and order.payment_code.upper() in tx_desc
                and tx_amount >= float(order.amount)
            ):
                matched_tx = tx
                break

        if matched_tx is not None:
            order.status = OrderStatus.PAID
            order.web2m_transaction_id = str(matched_tx.get("transactionID", ""))
            order.paid_at = now
            order.updated_at = now
            await order.save()

            await self._activate_membership(order.user_id, order.plan_code)
            log.info(
                "order.paid",
                order_id=str(order.oid),
                user_id=str(order.user_id),
                tx_id=order.web2m_transaction_id,
            )
            return True, order

        return False, order

    async def force_pay_order(
        self,
        order_id: PydanticObjectId,
        admin_id: PydanticObjectId,
        admin_username: str,
        note: str = "",
    ) -> Order:
        """Allow an admin to forcefully approve an order and grant membership."""
        order = await Order.get(order_id)
        if order is None:
            raise NotFoundError(detail="Đơn hàng không tồn tại.")

        if order.status in (OrderStatus.PAID, OrderStatus.MANUAL_PAID):
            return order

        now = datetime.now(UTC)
        order.status = OrderStatus.MANUAL_PAID
        order.web2m_transaction_id = f"MANUAL_{int(now.timestamp())}"
        order.paid_at = now
        order.updated_at = now
        await order.save()

        await self._activate_membership(order.user_id, order.plan_code)

        audit = AdminAuditLog(
            admin_id=admin_id,
            admin_username=admin_username,
            action="FORCE_PAY_ORDER",
            target_type="order",
            target_id=str(order.oid),
            details={
                "amount": order.amount,
                "plan_code": order.plan_code,
                "note": note,
            },
        )
        await audit.insert()

        log.info(
            "order.manual_paid",
            order_id=str(order.oid),
            user_id=str(order.user_id),
            admin=admin_username,
        )
        return order

    async def _activate_membership(
        self, user_id: PydanticObjectId, plan_code: str
    ) -> None:
        """Grant or extend membership for a user based on plan duration."""
        user = await User.get(user_id)
        if user is None:
            log.error("membership.user_not_found", user_id=str(user_id))
            return

        plan = await MembershipPlan.find_one({"code": plan_code})
        duration_days = plan.duration_days if plan else 30
        now = datetime.now(UTC)

        # Extend if currently active, otherwise start from now
        if (
            user.membership.is_active
            and user.membership.expires_at
            and user.membership.expires_at > now
        ):
            new_expiry = user.membership.expires_at + timedelta(days=duration_days)
        else:
            new_expiry = now + timedelta(days=duration_days)

        user.membership.is_active = True
        user.membership.plan_code = plan_code
        if not user.membership.started_at:
            user.membership.started_at = now
        user.membership.expires_at = new_expiry
        user.updated_at = now
        await user.save()

        log.info(
            "membership.activated",
            user_id=str(user.oid),
            plan=plan_code,
            expires_at=new_expiry.isoformat(),
        )
