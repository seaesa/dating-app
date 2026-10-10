from datetime import UTC, datetime

from beanie import PydanticObjectId
from pymongo.errors import DuplicateKeyError
from redis.exceptions import RedisError

from app.core.errors import BadRequestError, ConflictError, NotFoundError
from app.core.logging import get_logger
from app.core.ratelimit import sliding_window
from app.modules.connections.models import (
    ChatMessage,
    CloseReason,
    Connection,
    ConnectionStatus,
    MemberState,
    MessageKind,
    RevealKind,
    RevealState,
    SystemEvent,
)
from app.modules.connections.repository import ConnectionRepository, ordered_pair
from app.modules.connections.timeline import (
    Transition,
    announce_message,
    post_message,
    require_open,
    to_message_read,
)
from app.modules.interactions.models import UserInteraction
from app.modules.interactions.schemas import InteractionAction
from app.modules.notifications.service import PushKind
from app.modules.realtime.events import publish
from app.modules.users.models import User
from app.modules.users.schemas import UserStatus

log = get_logger(__name__)

REVEAL_LIMIT = 20
REVEAL_WINDOW_SECONDS = 3600


class ConnectionService:
    """The pair's lifecycle and its reveal state machine.

    request/accept/decline are the contract for the connection feature (Ghép
    đôi); this feature exposes only `close` over HTTP and uses the rest from the
    seed command.
    """

    def __init__(self, repository: ConnectionRepository | None = None) -> None:
        self.repository = repository or ConnectionRepository()

    async def request(self, actor: User, target_id: PydanticObjectId) -> Connection:
        if target_id == actor.oid:
            raise BadRequestError(detail="Cannot connect with yourself.")
        target = await User.get(target_id)
        if target is None or target.status is not UserStatus.ACTIVE:
            raise NotFoundError(detail="User not found.")
        if await self.repository.find_between(actor.oid, target_id) is not None:
            raise ConflictError(detail="These two people already have a connection.")
        low, high = ordered_pair(actor.oid, target_id)
        try:
            return await Connection(
                user_low=low,
                user_high=high,
                participant_ids=[low, high],
                requested_by=actor.oid,
            ).insert()
        except DuplicateKeyError as exc:
            raise ConflictError(
                detail="These two people already have a connection."
            ) from exc

    async def accept(self, actor: User, connection_id: PydanticObjectId) -> Connection:
        connection = await self.repository.get_for_member(connection_id, actor.oid)
        if (
            connection.status is not ConnectionStatus.PENDING
            or connection.requested_by == actor.oid
        ):
            raise ConflictError(detail="There is no request to accept.")
        now = datetime.now(UTC)
        opening: Transition = (
            {"status": ConnectionStatus.PENDING.value},
            {
                "$set": {
                    "status": ConnectionStatus.ACCEPTED.value,
                    "accepted_at": now,
                    "last_activity_at": now,
                    "members": [
                        MemberState(user_id=uid).model_dump()
                        for uid in connection.participant_ids
                    ],
                }
            },
        )
        message = await post_message(
            connection,
            actor_id=actor.oid,
            kind=MessageKind.SYSTEM,
            event=SystemEvent.CONNECTED,
            transition=opening,
        )
        if message is None:
            raise ConflictError(detail="There is no request to accept.")
        opened = await self.repository.get_or_404(connection.oid)
        await announce_message(opened, to_message_read(message), push_to=None)
        return opened

    async def request_reveal(
        self, actor: User, connection_id: PydanticObjectId, kind: RevealKind
    ) -> None:
        """Ask for a mutual reveal; if the other side already asked, grant it.

        Every transition is a guarded update committed together with the system
        message that records it, so a double tap or both people tapping at once
        cannot produce two transitions, nor a transition without its message.
        """
        connection = require_open(
            await self.repository.get_for_member(connection_id, actor.oid)
        )
        await sliding_window(
            f"rl:chat:reveal:{actor.oid}",
            limit=REVEAL_LIMIT,
            window=REVEAL_WINDOW_SECONDS,
        )
        field = f"reveals.{kind.value}"
        asking: Transition = (
            {f"{field}.state": RevealState.NONE.value},
            {
                "$set": {
                    f"{field}.state": RevealState.REQUESTED.value,
                    f"{field}.requested_by": actor.oid,
                    f"{field}.requested_at": datetime.now(UTC),
                }
            },
        )
        message = await post_message(
            connection,
            actor_id=actor.oid,
            kind=MessageKind.SYSTEM,
            event=SystemEvent.REVEAL_REQUESTED,
            reveal_kind=kind,
            transition=asking,
        )
        if message is not None:
            await self._announce_reveal(
                connection, actor.oid, kind, message, PushKind.REVEAL_REQUEST
            )
            return
        # Already granted, or already asked by this actor: nothing to do.
        await self._grant(connection, actor.oid, kind)

    async def accept_reveal(
        self, actor: User, connection_id: PydanticObjectId, kind: RevealKind
    ) -> None:
        connection = require_open(
            await self.repository.get_for_member(connection_id, actor.oid)
        )
        if not await self._grant(connection, actor.oid, kind):
            raise ConflictError(detail="There is no request to accept.")

    async def decline_reveal(
        self, actor: User, connection_id: PydanticObjectId, kind: RevealKind
    ) -> None:
        connection = require_open(
            await self.repository.get_for_member(connection_id, actor.oid)
        )
        field = f"reveals.{kind.value}"
        declining: Transition = (
            {
                f"{field}.state": RevealState.REQUESTED.value,
                f"{field}.requested_by": {"$ne": actor.oid},
            },
            {
                "$set": {
                    f"{field}.state": RevealState.NONE.value,
                    f"{field}.requested_by": None,
                    f"{field}.requested_at": None,
                }
            },
        )
        message = await post_message(
            connection,
            actor_id=actor.oid,
            kind=MessageKind.SYSTEM,
            event=SystemEvent.REVEAL_DECLINED,
            reveal_kind=kind,
            transition=declining,
        )
        if message is None:
            raise ConflictError(detail="There is no request to decline.")
        await self._announce_reveal(connection, actor.oid, kind, message, None)

    async def _grant(
        self, connection: Connection, actor_id: PydanticObjectId, kind: RevealKind
    ) -> bool:
        field = f"reveals.{kind.value}"
        granting: Transition = (
            {
                f"{field}.state": RevealState.REQUESTED.value,
                f"{field}.requested_by": {"$ne": actor_id},
            },
            {
                "$set": {
                    f"{field}.state": RevealState.GRANTED.value,
                    f"{field}.granted_at": datetime.now(UTC),
                }
            },
        )
        message = await post_message(
            connection,
            actor_id=actor_id,
            kind=MessageKind.SYSTEM,
            event=SystemEvent.REVEAL_GRANTED,
            reveal_kind=kind,
            transition=granting,
        )
        if message is None:
            return False
        await self._announce_reveal(
            connection, actor_id, kind, message, PushKind.REVEAL_GRANTED
        )
        return True

    async def _announce_reveal(
        self,
        connection: Connection,
        actor_id: PydanticObjectId,
        kind: RevealKind,
        message: ChatMessage,
        push_kind: PushKind | None,
    ) -> None:
        reveal = (await self.repository.get_or_404(connection.oid)).reveals.get(kind)
        try:
            # State only. Photos and phone are fetched through project_user,
            # never carried by an event.
            await publish(
                connection.participant_ids,
                "reveal.updated",
                {
                    "connectionId": str(connection.oid),
                    "kind": kind.value,
                    "state": reveal.state.value,
                    "requestedBy": (
                        str(reveal.requested_by) if reveal.requested_by else None
                    ),
                },
            )
        except RedisError:
            log.warning("chat.reveal_fanout_failed", connection_id=str(connection.oid))
        await announce_message(
            connection,
            to_message_read(message),
            push_to=connection.peer_of(actor_id) if push_kind else None,
            push_kind=push_kind or PushKind.MESSAGE,
        )

    async def close(
        self, actor: User, connection_id: PydanticObjectId, reason: CloseReason
    ) -> None:
        connection = await self.repository.get_for_member(connection_id, actor.oid)
        if reason is CloseReason.BLOCK:
            await self._record_block(actor.oid, connection.peer_of(actor.oid))
        await self._close(connection, actor.oid, reason)

    async def close_between(
        self,
        actor_id: PydanticObjectId,
        other_id: PydanticObjectId,
        reason: CloseReason,
    ) -> None:
        connection = await self.repository.find_between(actor_id, other_id)
        if connection is not None:
            await self._close(connection, actor_id, reason)

    async def _close(
        self, connection: Connection, actor_id: PydanticObjectId, reason: CloseReason
    ) -> None:
        result = await Connection.get_pymongo_collection().update_one(
            {"_id": connection.oid, "status": {"$ne": ConnectionStatus.CLOSED.value}},
            {
                "$set": {
                    "status": ConnectionStatus.CLOSED.value,
                    "closed_at": datetime.now(UTC),
                    "closed_by": actor_id,
                    "close_reason": reason.value,
                }
            },
        )
        if result.modified_count == 0:
            return
        try:
            await publish(
                connection.participant_ids,
                "connection.closed",
                {"connectionId": str(connection.oid)},
            )
        except RedisError:
            log.warning("chat.close_fanout_failed", connection_id=str(connection.oid))

    async def _record_block(
        self, actor_id: PydanticObjectId, target_id: PydanticObjectId
    ) -> None:
        now = datetime.now(UTC)
        await UserInteraction.get_pymongo_collection().update_one(
            {"actor_id": actor_id, "target_id": target_id},
            {
                "$set": {"action": InteractionAction.BLOCK.value, "updated_at": now},
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
