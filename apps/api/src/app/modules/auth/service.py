import secrets
from typing import Any

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from pymongo.errors import DuplicateKeyError

from app.core.config import Settings
from app.core.errors import UnauthorizedError, ValidationError
from app.core.logging import get_logger
from app.core.phone import to_e164
from app.core.ratelimit import sliding_window
from app.core.redis import get_redis
from app.core.security import (
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.modules.auth.exceptions import OtpExpiredError, OtpInvalidError
from app.modules.auth.schemas import TokenPair
from app.modules.auth.sms.provider import SmsProvider
from app.modules.users.repository import UserRepository

log = get_logger(__name__)
hasher = PasswordHasher()

OTP_KEY = "otp:{phone}"
OTP_ATTEMPTS_KEY = "otp:attempts:{phone}"
REFRESH_KEY = "refresh:{jti}"


class AuthService:
    def __init__(
        self,
        settings: Settings,
        sms: SmsProvider,
        users: UserRepository | None = None,
    ) -> None:
        self.settings = settings
        self.sms = sms
        self.users = users or UserRepository()

    def _normalize(self, raw: str) -> str:
        phone = to_e164(raw)
        if phone is None:
            raise ValidationError(
                detail="That phone number is not valid.",
                errors={"phone": ["invalid"]},
            )
        return phone

    async def request_otp(self, raw_phone: str) -> int:
        phone = self._normalize(raw_phone)

        await sliding_window(f"rl:otp:phone:{phone}", limit=3, window=600)

        code = "".join(
            secrets.choice("0123456789") for _ in range(self.settings.otp_length)
        )
        redis = get_redis()
        # Hashed, not stored plain: a Redis dump should not be a list of live
        # login codes.
        # `set(..., ex=)` rather than the deprecated `setex`.
        await redis.set(
            OTP_KEY.format(phone=phone), hasher.hash(code), ex=self.settings.otp_ttl
        )
        await redis.delete(OTP_ATTEMPTS_KEY.format(phone=phone))

        await self.sms.send(phone, f"Terdin code: {code}. Valid for 5 minutes.")
        log.info("otp.sent", phone=phone)
        return self.settings.otp_ttl

    async def verify_otp(self, raw_phone: str, code: str) -> TokenPair:
        phone = self._normalize(raw_phone)
        redis = get_redis()

        stored = await redis.get(OTP_KEY.format(phone=phone))
        if stored is None:
            raise OtpExpiredError(detail="The code has expired. Request a new one.")

        attempts = await redis.incr(OTP_ATTEMPTS_KEY.format(phone=phone))
        await redis.expire(OTP_ATTEMPTS_KEY.format(phone=phone), self.settings.otp_ttl)
        if attempts > self.settings.otp_max_attempts:
            await redis.delete(OTP_KEY.format(phone=phone))
            raise OtpInvalidError(detail="Too many attempts. Request a new code.")

        try:
            hasher.verify(stored, code)
        except VerifyMismatchError as exc:
            raise OtpInvalidError(detail="The code is incorrect.") from exc

        # Consume the challenge: a code that survives verification is a
        # reusable credential.
        await redis.delete(
            OTP_KEY.format(phone=phone), OTP_ATTEMPTS_KEY.format(phone=phone)
        )

        user = await self.users.find_by_phone(phone)
        is_new = user is None
        if user is None:
            try:
                user = await self.users.create_for_phone(phone)
            except DuplicateKeyError:
                # A concurrent verify won the race. Read its user rather than
                # failing: both callers proved possession of the same number.
                user = await self.users.find_by_phone(phone)
                is_new = False
                if user is None:  # pragma: no cover - unreachable given the index
                    raise

        return await self._issue(str(user.id), is_new_user=is_new)

    async def _issue(self, subject: str, *, is_new_user: bool = False) -> TokenPair:
        access = create_access_token(subject, self.settings)
        refresh, jti = create_refresh_token(subject, self.settings)
        # The jti is the revocation handle: logout and rotation delete it.
        await get_redis().set(
            REFRESH_KEY.format(jti=jti), subject, ex=self.settings.refresh_token_ttl
        )
        return TokenPair(
            access_token=access,
            refresh_token=refresh,
            expires_in=self.settings.access_token_ttl,
            is_new_user=is_new_user,
        )

    async def refresh(self, token: str) -> TokenPair:
        payload: dict[str, Any] = decode_token(
            token, self.settings, expect=TokenType.REFRESH
        )
        removed = await get_redis().delete(REFRESH_KEY.format(jti=payload["jti"]))
        if not removed:
            # Already rotated or revoked. A replayed refresh token means either
            # a stale client or a stolen one; neither may work.
            raise UnauthorizedError(detail="This session is no longer valid.")
        return await self._issue(payload["sub"])

    async def logout(self, token: str) -> None:
        payload = decode_token(token, self.settings, expect=TokenType.REFRESH)
        await get_redis().delete(REFRESH_KEY.format(jti=payload["jti"]))
