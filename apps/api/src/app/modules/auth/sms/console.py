from app.core.config import Settings
from app.core.logging import get_logger
from app.modules.auth.sms.provider import OTP_MESSAGE

log = get_logger(__name__)


class ConsoleSmsProvider:
    """Logs the message instead of sending it. Development only."""

    def __init__(self, settings: Settings) -> None:
        self._app = settings.app_name

    async def send_code(self, phone: str, code: str) -> None:
        message = OTP_MESSAGE.format(app=self._app, code=code)
        log.info("sms.console", phone=phone, message=message)
