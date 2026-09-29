import httpx

from app.core.config import Settings
from app.core.logging import get_logger
from app.modules.auth.sms.provider import SmsProvider

log = get_logger(__name__)


class TwilioSmsProvider:
    """Twilio over its REST API.

    Called directly rather than through the SDK: this is one POST, and the SDK
    is synchronous, which would block the event loop.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._url = (
            "https://api.twilio.com/2010-04-01/Accounts/"
            f"{settings.twilio_account_sid}/Messages.json"
        )

    async def send(self, phone: str, message: str) -> None:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                self._url,
                auth=(
                    self._settings.twilio_account_sid,
                    self._settings.twilio_auth_token,
                ),
                data={
                    "To": phone,
                    "From": self._settings.twilio_from_number,
                    "Body": message,
                },
            )
        if response.is_error:
            log.error("sms.twilio.failed", status=response.status_code)
            response.raise_for_status()


def build_sms_provider(settings: Settings) -> SmsProvider:
    from app.modules.auth.sms.console import ConsoleSmsProvider

    if settings.sms_provider == "twilio":
        return TwilioSmsProvider(settings)
    return ConsoleSmsProvider()
