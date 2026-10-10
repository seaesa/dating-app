from typing import Annotated

from pydantic import Field

from app.core.schemas import BaseSchema


class OtpRequestBody(BaseSchema):
    phone: Annotated[str, Field(min_length=6, max_length=20)]


class OtpRequestResponse(BaseSchema):
    expires_in: int
    # Only with SMS_PROVIDER=console, which production refuses: lets a demo
    # build show the code in the app since no SMS is sent.
    demo_code: str | None = None


class OtpVerifyBody(BaseSchema):
    phone: Annotated[str, Field(min_length=6, max_length=20)]
    code: Annotated[str, Field(min_length=4, max_length=8, pattern=r"^\d+$")]


class TokenPair(BaseSchema):
    access_token: str
    refresh_token: str
    # Not a secret: the OAuth 2.0 token type, which is literally "bearer".
    token_type: str = "bearer"  # noqa: S105
    expires_in: int
    is_new_user: bool = False


class RefreshBody(BaseSchema):
    refresh_token: str
