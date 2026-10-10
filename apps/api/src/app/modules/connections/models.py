from datetime import UTC, datetime
from enum import StrEnum
from typing import Any, ClassVar

import pymongo
from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field

from app.core.db import DOCUMENT_MODELS


def _now() -> datetime:
    return datetime.now(UTC)


class ConnectionStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    CLOSED = "closed"


class CloseReason(StrEnum):
    UNMATCH = "unmatch"
    BLOCK = "block"


class RevealKind(StrEnum):
    PHOTOS = "photos"
    PHONE = "phone"


class RevealState(StrEnum):
    NONE = "none"
    REQUESTED = "requested"
    GRANTED = "granted"


class MessageKind(StrEnum):
    TEXT = "text"
    SYSTEM = "system"


class SystemEvent(StrEnum):
    CONNECTED = "connected"
    REVEAL_REQUESTED = "reveal_requested"
    REVEAL_GRANTED = "reveal_granted"
    REVEAL_DECLINED = "reveal_declined"


# Embedded models are plain BaseModel, not BaseSchema: they are stored, and
# BaseSchema would store camelCase keys that the raw update paths would miss.
class Reveal(BaseModel):
    state: RevealState = RevealState.NONE
    requested_by: PydanticObjectId | None = None
    requested_at: datetime | None = None
    granted_at: datetime | None = None


class Reveals(BaseModel):
    photos: Reveal = Field(default_factory=Reveal)
    phone: Reveal = Field(default_factory=Reveal)

    def get(self, kind: RevealKind) -> Reveal:
        return self.photos if kind is RevealKind.PHOTOS else self.phone


class MemberState(BaseModel):
    user_id: PydanticObjectId
    last_read_id: PydanticObjectId | None = None
    unread_count: int = 0


class LastMessage(BaseModel):
    """Denormalised so the chat list needs no second query."""

    id: PydanticObjectId
    sender_id: PydanticObjectId | None
    actor_id: PydanticObjectId
    kind: MessageKind
    preview: str
    event: SystemEvent | None = None
    reveal_kind: RevealKind | None = None
    created_at: datetime


class Connection(Document):
    """One document per pair: the connection and its chat room.

    A pair has exactly one room, so keeping both together means "is this room
    open, and is the sender in it" is one read, and closing happens in one place.
    """

    user_low: PydanticObjectId
    user_high: PydanticObjectId
    participant_ids: list[PydanticObjectId]
    requested_by: PydanticObjectId
    status: ConnectionStatus = ConnectionStatus.PENDING
    created_at: datetime = Field(default_factory=_now)
    accepted_at: datetime | None = None
    closed_at: datetime | None = None
    closed_by: PydanticObjectId | None = None
    close_reason: CloseReason | None = None
    members: list[MemberState] = Field(default_factory=list)
    reveals: Reveals = Field(default_factory=Reveals)
    last_message: LastMessage | None = None
    last_activity_at: datetime = Field(default_factory=_now)

    @property
    def oid(self) -> PydanticObjectId:
        """The id, without Beanie's Optional. See User.oid."""
        if self.id is None:  # pragma: no cover - inserted documents have one
            raise RuntimeError("Connection has no id; it was never saved")
        return self.id

    def peer_of(self, user_id: PydanticObjectId) -> PydanticObjectId:
        return self.user_high if user_id == self.user_low else self.user_low

    def member(self, user_id: PydanticObjectId) -> MemberState:
        for member in self.members:
            if member.user_id == user_id:
                return member
        return MemberState(user_id=user_id)

    class Settings:
        name = "connections"
        indexes: ClassVar[list[Any]] = [
            pymongo.IndexModel(
                [("user_low", pymongo.ASCENDING), ("user_high", pymongo.ASCENDING)],
                unique=True,
            ),
            [
                ("participant_ids", pymongo.ASCENDING),
                ("status", pymongo.ASCENDING),
                ("last_activity_at", pymongo.DESCENDING),
                ("_id", pymongo.DESCENDING),
            ],
        ]


class ChatMessage(Document):
    connection_id: PydanticObjectId
    # Set on text messages only; a system message has an actor but no sender.
    sender_id: PydanticObjectId | None = None
    actor_id: PydanticObjectId
    kind: MessageKind
    body: str | None = None
    event: SystemEvent | None = None
    reveal_kind: RevealKind | None = None
    client_id: str | None = None
    created_at: datetime = Field(default_factory=_now)

    @property
    def oid(self) -> PydanticObjectId:
        """The id, without Beanie's Optional. See User.oid."""
        if self.id is None:  # pragma: no cover - inserted documents have one
            raise RuntimeError("ChatMessage has no id; it was never saved")
        return self.id

    class Settings:
        name = "messages"
        indexes: ClassVar[list[Any]] = [
            [("connection_id", pymongo.ASCENDING), ("_id", pymongo.DESCENDING)],
            pymongo.IndexModel(
                [("sender_id", pymongo.ASCENDING), ("client_id", pymongo.ASCENDING)],
                unique=True,
                partialFilterExpression={"client_id": {"$type": "string"}},
            ),
        ]


DOCUMENT_MODELS.append(Connection)
DOCUMENT_MODELS.append(ChatMessage)
