from typing import Protocol

OTP_MESSAGE = "{app} code: {code}. Valid for 5 minutes."


class SmsProvider(Protocol):
    """Sending an SMS is an interface, not a vendor.

    Development uses the console implementation, so a local setup needs no SMS
    account and costs nothing.
    """

    async def send_code(self, phone: str, code: str) -> None: ...
