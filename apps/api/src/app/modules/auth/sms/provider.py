from typing import Protocol


class SmsProvider(Protocol):
    """Sending an SMS is an interface, not a vendor.

    Development uses the console implementation, so a local setup needs no SMS
    account and costs nothing.
    """

    async def send(self, phone: str, message: str) -> None: ...
