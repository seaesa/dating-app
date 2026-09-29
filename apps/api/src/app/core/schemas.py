from typing import Any

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class BaseSchema(BaseModel):
    """Base for every request and response schema.

    Emits camelCase so the OpenAPI document — and therefore the TypeScript
    generated from it — matches JavaScript convention without a mapping layer
    on either side. Accepts both spellings on input so internal callers can use
    Python field names.

    `extra="forbid"` makes a typo in a request body a 422 rather than a
    silently ignored field.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        validate_by_name=True,
        validate_by_alias=True,
        serialize_by_alias=True,
        extra="forbid",
        from_attributes=True,
    )


class CursorPage[T](BaseSchema):
    """Cursor pagination, not offset.

    Offset pagination re-reads skipped documents and returns duplicates when
    rows shift between pages. The discovery feed will page over a large,
    changing collection, so cursors are the base convention.
    """

    items: list[T]
    next_cursor: str | None = None


class Message(BaseSchema):
    message: str


def to_camel_dict(data: dict[str, Any]) -> dict[str, Any]:
    return {to_camel(k): v for k, v in data.items()}
