import re
from typing import ClassVar

from app.core.logging import get_logger

log = get_logger(__name__)


class ConsoleSmsProvider:
    """Logs the message instead of sending it.

    `sent` records the last code per phone so tests can read it without the API
    ever putting a code in a response body.
    """

    sent: ClassVar[dict[str, str]] = {}

    async def send(self, phone: str, message: str) -> None:
        match = re.search(r"\b(\d{4,8})\b", message)
        if match:
            self.sent[phone] = match.group(1)
        log.info("sms.console", phone=phone, message=message)
