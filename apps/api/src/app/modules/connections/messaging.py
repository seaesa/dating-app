from beanie import PydanticObjectId
from pymongo.errors import DuplicateKeyError
from redis.exceptions import RedisError

from app.core.config import Settings
from app.core.errors import ConflictError, NotFoundError
from app.core.logging import get_logger
from app.core.ratelimit import sliding_window
from app.modules.connections.models import (
    ChatMessage,
    Connection,
    LastMessage,
    MessageKind,
    RevealKind,
    Reveals,
)
from app.modules.connections.repository import (
    ChatMessageRepository,
    ConnectionRepository,
)
from app.modules.connections.schemas import (
    ConnectionPage,
    ConnectionRead,
    ConnectionSummaryRead,
    LastMessageRead,
    MessagePage,
    MessageRead,
    RevealRead,
    RevealsRead,
    SendMessageBody,
    UnreadCountRead,
)
from app.modules.connections.service import ConnectionService
from app.modules.connections.timeline import (
    announce_message,
    post_message,
    require_open,
    to_message_read,
)
from app.modules.media.service import MediaService
from app.modules.realtime.events import publish
from app.modules.users.models import User
from app.modules.users.schemas import UserStatus
from app.modules.users.service import UserService
from app.modules.users.visibility import grants_of

log = get_logger(__name__)

SEND_LIMIT = 30
SEND_WINDOW_SECONDS = 60


def to_reveals_read(reveals: Reveals) -> RevealsRead:
    return RevealsRead(
        photos=RevealRead(
            state=reveals.photos.state, requested_by=reveals.photos.requested_by
        ),
    )


def to_last_read(last: LastMessage) -> LastMessageRead:
    return LastMessageRead(
        id=last.id,
        sender_id=last.sender_id,
        actor_id=last.actor_id,
        kind=last.kind,
        preview=last.preview,
        event=last.event,
        reveal_kind=last.reveal_kind,
        created_at=last.created_at,
    )


class MessagingService:
    def __init__(
        self,
        settings: Settings,
        connections: ConnectionRepository | None = None,
        messages: ChatMessageRepository | None = None,
    ) -> None:
        self.settings = settings
        self.connections = connections or ConnectionRepository()
        self.messages = messages or ChatMessageRepository()
        self.media = MediaService(settings)

    async def _reads(self, messages: list[ChatMessage]) -> list[MessageRead]:
        """Messages with their images signed: one query and one presign batch."""
        urls = await self.media.signed_for_owners(
            [(m.media_id, m.sender_id) for m in messages if m.media_id and m.sender_id]
        )
        return [
            to_message_read(m, urls.get(m.media_id) if m.media_id else None)
            for m in messages
        ]

    async def _open(self, viewer: User, connection_id: PydanticObjectId) -> Connection:
        return require_open(
            await self.connections.get_for_member(connection_id, viewer.oid)
        )

    async def list_for(
        self, viewer: User, *, limit: int, cursor: str | None
    ) -> ConnectionPage:
        rows, next_cursor = await self.connections.list_active(
            viewer.oid, limit=limit, cursor=cursor
        )
        peer_ids = [row.peer_of(viewer.oid) for row in rows]
        users = {
            user.oid: user
            for user in await User.find({"_id": {"$in": peer_ids}}).to_list()
        }
        peers = await UserService(self.settings).project_peers(
            [
                (users[peer_id], grants_of(row))
                for row, peer_id in zip(rows, peer_ids, strict=True)
                if peer_id in users
            ]
        )
        items = [
            ConnectionSummaryRead(
                id=row.oid,
                peer=peers[peer_id],
                last_message=to_last_read(row.last_message) if row.last_message else None,
                unread_count=row.member(viewer.oid).unread_count,
                reveals=to_reveals_read(row.reveals),
                your_turn=row.last_message is not None
                and row.last_message.sender_id == peer_id,
                last_activity_at=row.last_activity_at,
            )
            for row, peer_id in zip(rows, peer_ids, strict=True)
            if peer_id in peers
        ]
        return ConnectionPage(items=items, next_cursor=next_cursor)

    async def get_for(
        self, viewer: User, connection_id: PydanticObjectId
    ) -> ConnectionRead:
        connection = await self._open(viewer, connection_id)
        peer_id = connection.peer_of(viewer.oid)
        peer = await UserService(self.settings).get_for_viewer(peer_id, viewer)
        return ConnectionRead(
            id=connection.oid,
            peer=peer,
            reveals=to_reveals_read(connection.reveals),
            unread_count=connection.member(viewer.oid).unread_count,
            peer_last_read_id=connection.member(peer_id).last_read_id,
        )

    async def unread_count(self, viewer: User) -> UnreadCountRead:
        return UnreadCountRead(count=await self.connections.unread_total(viewer.oid))

    async def list_messages(
        self,
        viewer: User,
        connection_id: PydanticObjectId,
        *,
        limit: int,
        cursor: str | None,
    ) -> MessagePage:
        connection = await self._open(viewer, connection_id)
        page = await self.messages.list_page(
            limit=limit, cursor=cursor, filters={"connection_id": connection.oid}
        )
        return MessagePage(
            items=await self._reads(page.items), next_cursor=page.next_cursor
        )

    async def send(
        self, viewer: User, connection_id: PydanticObjectId, body: SendMessageBody
    ) -> MessageRead:
        # Idempotency first: a retry of a request that did succeed must get the
        # stored message back, never a duplicate or a 429.
        existing = await self.messages.find_by_client_id(viewer.oid, body.client_id)
        if existing is not None:
            if existing.connection_id != connection_id:
                raise ConflictError(detail="That clientId was already used.")
            return (await self._reads([existing]))[0]

        connection = await self._open(viewer, connection_id)
        peer_id = connection.peer_of(viewer.oid)
        suspended = await User.find(
            {"_id": peer_id, "status": UserStatus.SUSPENDED.value}
        ).count()
        if suspended:
            raise ConflictError(detail="This conversation is read-only.")
        await sliding_window(
            f"rl:chat:send:{viewer.oid}", limit=SEND_LIMIT, window=SEND_WINDOW_SECONDS
        )
        image = body.image
        if image is not None:
            await self.media.assert_chat_image(image.media_id, owner_id=viewer.oid)
        try:
            message = await post_message(
                connection,
                actor_id=viewer.oid,
                kind=MessageKind.TEXT if image is None else MessageKind.IMAGE,
                body=body.body,
                image=(image.media_id, image.width, image.height) if image else None,
                client_id=body.client_id,
            )
        except DuplicateKeyError:
            again = await self.messages.find_by_client_id(viewer.oid, body.client_id)
            if again is None:
                raise
            return (await self._reads([again]))[0]
        if message is None:
            # Closed between the read above and the write.
            raise ConflictError(detail="This conversation has ended.")

        read = (await self._reads([message]))[0]
        await announce_message(connection, read, push_to=peer_id)
        return read

    async def mark_read(
        self,
        viewer: User,
        connection_id: PydanticObjectId,
        last_read_id: PydanticObjectId,
    ) -> None:
        connection = await self._open(viewer, connection_id)
        exists = await ChatMessage.find(
            {"_id": last_read_id, "connection_id": connection.oid}
        ).count()
        if not exists:
            raise NotFoundError(detail="No such message.")
        await Connection.get_pymongo_collection().update_one(
            {"_id": connection.oid},
            {
                # $max: a late request for an older message never moves it back.
                "$max": {"members.$[me].last_read_id": last_read_id},
                "$set": {"members.$[me].unread_count": 0},
            },
            array_filters=[{"me.user_id": viewer.oid}],
        )
        current = connection.member(viewer.oid).last_read_id
        effective = max(current, last_read_id) if current is not None else last_read_id
        try:
            await publish(
                connection.participant_ids,
                "connection.read",
                {
                    "connectionId": str(connection.oid),
                    "userId": str(viewer.oid),
                    "lastReadId": str(effective),
                },
            )
        except RedisError:
            log.warning("chat.read_fanout_failed", connection_id=str(connection.oid))

    async def request_reveal(
        self, viewer: User, connection_id: PydanticObjectId, kind: RevealKind
    ) -> ConnectionRead:
        await ConnectionService(self.connections).request_reveal(
            viewer, connection_id, kind
        )
        return await self.get_for(viewer, connection_id)

    async def accept_reveal(
        self, viewer: User, connection_id: PydanticObjectId, kind: RevealKind
    ) -> ConnectionRead:
        await ConnectionService(self.connections).accept_reveal(
            viewer, connection_id, kind
        )
        return await self.get_for(viewer, connection_id)

    async def decline_reveal(
        self, viewer: User, connection_id: PydanticObjectId, kind: RevealKind
    ) -> ConnectionRead:
        await ConnectionService(self.connections).decline_reveal(
            viewer, connection_id, kind
        )
        return await self.get_for(viewer, connection_id)
