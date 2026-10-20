from datetime import UTC, datetime

from beanie import Document, PydanticObjectId
from pydantic import Field

from app.core.db import DOCUMENT_MODELS


class SystemConfig(Document):
    """Global system configuration managed by administrators."""

    free_mode_enabled: bool = True
    qr_ttl_minutes: int = 15
    web2m_bank_name: str = "MBBank"
    web2m_bank_number: str = ""
    web2m_account_holder: str = ""
    web2m_bank_password: str = ""
    web2m_bank_token: str = ""
    web2m_api_get_transaction: str = ""
    web2m_api_get_qr: str = ""
    support_zalo_url: str = ""
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_by: str | None = None

    @property
    def oid(self) -> PydanticObjectId:
        """The id, without Beanie's Optional. See User.oid."""
        if self.id is None:
            raise RuntimeError("SystemConfig has no id; it was never saved")
        return self.id

    class Settings:
        name = "system_configs"


DOCUMENT_MODELS.append(SystemConfig)
