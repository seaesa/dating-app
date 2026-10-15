from typing import Any

from beanie import PydanticObjectId
from pymongo.asynchronous.client_session import AsyncClientSession
from redis.exceptions import RedisError

from app.core.errors import ConflictError, NotFoundError
from app.core.logging import get_logger
from app.modules.connections.models import (
    ChatMessage,
    Connection,
    ConnectionStatus,
    LastMessage,
    MessageKind,
    RevealKind,
    SystemEvent,
)
from app.modules.connections.schemas import MessageImageRead, MessageRead
from app.modules.notifications.service import PushKind, enqueue_push
from app.modules.realtime.events import publish

log = get_logger(__name__)

PREVIEW_LENGTH = 80


def require_open(connection: Connection) -> Connection:
    if connection.status is ConnectionStatus.CLOSED:
        raise ConflictError(detail="This conversation has ended.")
    if connection.status is not ConnectionStatus.ACCEPTED:
        raise NotFoundError(detail="No such conversation.")
    return connection


def to_message_read(message: ChatMessage, image_url: str | None = None) -> MessageRead:
    """`image_url` is the signed URL of an image message's media, if it exists."""
    image = (
        MessageImageRead(url=image_url, width=message.width, height=message.height)
        if image_url and message.width and message.height
        else None
    )
    return MessageRead(
        id=message.oid,
        connection_id=message.connection_id,
        sender_id=message.sender_id,
        actor_id=message.actor_id,
        kind=message.kind,
        body=message.body,
        image=image,
        event=message.event,
        reveal_kind=message.reveal_kind,
        client_id=message.client_id,
        created_at=message.created_at,
    )


class _AbortError(Exception):
    """Rolls the transaction back when a guarded update matched nothing."""


# A conditional update ({filter}, {update}) applied to the room in the same
# transaction as the message, so a state change and the message recording it
# land together or not at all.
Transition = tuple[dict[str, Any], dict[str, Any]]


async def post_message(
    connection: Connection,
    *,
    actor_id: PydanticObjectId,
    kind: MessageKind,
    body: str | None = None,
    image: tuple[PydanticObjectId, int, int] | None = None,
    event: SystemEvent | None = None,
    reveal_kind: RevealKind | None = None,
    client_id: str | None = None,
    transition: Transition | None = None,
) -> ChatMessage | None:
    """Insert a message and update the room's counters atomically.

    One transaction, so a stored message can never be missing from the list
    preview or the unread badge. The actor has read their own message; the
    other member gets one more unread.

    Returns None, storing nothing, when the room is no longer open or the
    `transition` no longer applies (someone else got there first).
    `with_transaction` retries the write conflicts that two people writing to
    the same room at once produce.
    """
    media_id, width, height = image or (None, None, None)
    message = ChatMessage(
        id=PydanticObjectId(),
        connection_id=connection.oid,
        sender_id=None if kind is MessageKind.SYSTEM else actor_id,
        actor_id=actor_id,
        kind=kind,
        body=body,
        media_id=media_id,
        width=width,
        height=height,
        event=event,
        reveal_kind=reveal_kind,
        client_id=client_id,
    )
    last = LastMessage(
        id=message.oid,
        sender_id=message.sender_id,
        actor_id=actor_id,
        kind=kind,
        preview=(body or "")[:PREVIEW_LENGTH],
        event=event,
        reveal_kind=reveal_kind,
        created_at=message.created_at,
    )
    update: dict[str, Any] = {
        "$set": {
            "last_message": last.model_dump(),
            "last_activity_at": message.created_at,
            "members.$[actor].last_read_id": message.oid,
        },
        "$inc": {"members.$[other].unread_count": 1},
    }
    array_filters: list[dict[str, Any]] = [
        {"actor.user_id": actor_id},
        {"other.user_id": {"$ne": actor_id}},
    ]
    rooms = Connection.get_pymongo_collection()

    async def write(session: AsyncClientSession) -> None:
        if transition is not None:
            guard, change = transition
            applied = await rooms.update_one(
                {"_id": connection.oid, **guard}, change, session=session
            )
            if applied.modified_count == 0:
                raise _AbortError
        # The status filter closes the race with a concurrent close or block:
        # a room closed after the caller read it takes no more messages.
        counted = await rooms.update_one(
            {"_id": connection.oid, "status": ConnectionStatus.ACCEPTED.value},
            update,
            array_filters=array_filters,
            session=session,
        )
        if counted.matched_count == 0:
            raise _AbortError
        await message.insert(session=session)

    client = ChatMessage.get_pymongo_collection().database.client
    async with client.start_session() as session:
        try:
            await session.with_transaction(write)
        except _AbortError:
            return None
    return message


async def announce_message(
    connection: Connection,
    message: MessageRead,
    *,
    push_to: PydanticObjectId | None,
    push_kind: PushKind = PushKind.MESSAGE,
) -> None:
    """Best effort, after the commit: the data is already safe in Mongo.

    A Redis outage costs realtime delivery, not the message; clients catch up
    when they refetch on reconnect.
    """
    try:
        await publish(
            connection.participant_ids,
            "message.created",
            {
                "connectionId": str(connection.oid),
                "message": message.model_dump(mode="json"),
            },
        )
        if push_to is not None:
            await enqueue_push(push_to, connection.oid, push_kind)
    except RedisError:
        log.warning("chat.fanout_failed", connection_id=str(connection.oid))
