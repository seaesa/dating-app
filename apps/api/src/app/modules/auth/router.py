from fastapi import APIRouter, Request, status

from app.core.deps import SettingsDep
from app.core.ratelimit import sliding_window
from app.core.schemas import Message
from app.modules.auth.schemas import (
    OtpRequestBody,
    OtpRequestResponse,
    OtpVerifyBody,
    RefreshBody,
    TokenPair,
)
from app.modules.auth.service import AuthService
from app.modules.auth.sms.twilio import build_sms_provider

router = APIRouter(prefix="/auth", tags=["auth"])


def _service(settings: SettingsDep) -> AuthService:
    return AuthService(settings, build_sms_provider(settings))


@router.post(
    "/otp/request",
    response_model=OtpRequestResponse,
    status_code=status.HTTP_202_ACCEPTED,
    operation_id="requestOtp",
)
async def request_otp(
    body: OtpRequestBody, request: Request, settings: SettingsDep
) -> OtpRequestResponse:
    # A per-IP limit on top of the per-phone one, so one host cannot enumerate
    # numbers by cycling through them.
    client_host = request.client.host if request.client else "unknown"
    await sliding_window(f"rl:otp:ip:{client_host}", limit=10, window=3600)

    expires_in = await _service(settings).request_otp(body.phone)
    return OtpRequestResponse(expires_in=expires_in)


@router.post("/otp/verify", response_model=TokenPair, operation_id="verifyOtp")
async def verify_otp(body: OtpVerifyBody, settings: SettingsDep) -> TokenPair:
    return await _service(settings).verify_otp(body.phone, body.code)


@router.post("/refresh", response_model=TokenPair, operation_id="refreshTokens")
async def refresh(body: RefreshBody, settings: SettingsDep) -> TokenPair:
    return await _service(settings).refresh(body.refresh_token)


@router.post("/logout", response_model=Message, operation_id="logout")
async def logout(body: RefreshBody, settings: SettingsDep) -> Message:
    await _service(settings).logout(body.refresh_token)
    return Message(message="Signed out.")
