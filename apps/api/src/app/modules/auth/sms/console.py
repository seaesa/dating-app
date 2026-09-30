from app.core.logging import get_logger

log = get_logger(__name__)


class ConsoleSmsProvider:
    """Logs the message instead of sending it. Development only."""

    async def send(self, phone: str, message: str) -> None:
        log.info("sms.console", phone=phone, message=message)
