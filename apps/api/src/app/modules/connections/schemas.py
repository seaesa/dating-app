from datetime import datetime
from typing import Annotated

from beanie import PydanticObjectId
from pydantic import StringConstraints

from app.core.schemas import BaseSchema, CursorPage
from app.modules.connections.models import (
    CloseReason,
    MessageKind,
    RevealKind,
    RevealState,
    SystemEvent,
)
from app.modules.users.schemas import UserRead


class MessageRead(BaseSchema):
    id: PydanticObjectId
    connection_id: PydanticObjectId
    sender_id: PydanticObjectId | None = None
    actor_id: PydanticObjectId
    kind: MessageKind
    body: str | None = None
    event: SystemEvent | None = None
    reveal_kind: RevealKind | None = None
    client_id: str | None = None
    created_at: datetime


class RevealRead(BaseSchema):
    state: RevealState
    requested_by: PydanticObjectId | None = None


class RevealsRead(BaseSchema):
    photos: RevealRead
    phone: RevealRead


class LastMessageRead(BaseSchema):
    id: PydanticObjectId
    sender_id: PydanticObjectId | None = None
    actor_id: PydanticObjectId
    kind: MessageKind
    preview: str
    event: SystemEvent | None = None
    reveal_kind: RevealKind | None = None
    created_at: datetime


class ConnectionSummaryRead(BaseSchema):
    id: PydanticObjectId
    peer: UserRead
    last_message: LastMessageRead | None = None
    unread_count: int
    reveals: RevealsRead
    your_turn: bool
    last_activity_at: datetime


class ConnectionRead(BaseSchema):
    id: PydanticObjectId
    peer: UserRead
    reveals: RevealsRead
    unread_count: int
    peer_last_read_id: PydanticObjectId | None = None


# Named subclasses so the generated TypeScript gets readable type names.
class ConnectionPage(CursorPage[ConnectionSummaryRead]):
    pass


class MessagePage(CursorPage[MessageRead]):
    pass


class UnreadCountRead(BaseSchema):
    count: int


class SendMessageBody(BaseSchema):
    client_id: Annotated[str, StringConstraints(min_length=8, max_length=64)]
    body: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)
    ]


class MarkReadBody(BaseSchema):
    last_read_id: PydanticObjectId


class CloseBody(BaseSchema):
    reason: CloseReason
