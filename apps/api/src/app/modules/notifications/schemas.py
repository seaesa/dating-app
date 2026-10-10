from enum import StrEnum
from typing import Annotated

from pydantic import Field

from app.core.schemas import BaseSchema


class PushPlatform(StrEnum):
    IOS = "ios"
    ANDROID = "android"


class PushDeviceBody(BaseSchema):
    token: Annotated[str, Field(min_length=1, max_length=200)]
    platform: PushPlatform
