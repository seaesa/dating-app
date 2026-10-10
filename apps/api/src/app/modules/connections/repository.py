import base64
import binascii
from datetime import datetime
from typing import Any

from beanie import PydanticObjectId
from bson.errors import InvalidId

from app.core.errors import NotFoundError, ValidationError
from app.core.repository import MAX_PAGE_SIZE, BaseRepository
from app.modules.connections.models import ChatMessage, Connection, ConnectionStatus


def ordered_pair(
    a: PydanticObjectId, b: PydanticObjectId
) -> tuple[PydanticObjectId, PydanticObjectId]:
    """The pair key, the same whichever side asks."""
    return (a, b) if a < b else (b, a)


def encode_activity_cursor(at: datetime, connection_id: PydanticObjectId) -> str:
    raw = f"{at.isoformat()}|{connection_id}"
    return base64.urlsafe_b64encode(raw.encode()).decode().rstrip("=")


def decode_activity_cursor(cursor: str) -> tuple[datetime, PydanticObjectId]:
    padded = cursor + "=" * (-len(cursor) % 4)
    try:
        at, raw_id = base64.urlsafe_b64decode(padded.encode()).decode().split("|", 1)
        return datetime.fromisoformat(at), PydanticObjectId(raw_id)
    except (binascii.Error, InvalidId, UnicodeDecodeError, ValueError) as exc:
        raise ValidationError(
            detail="The cursor is malformed.", errors={"cursor": ["invalid"]}
        ) from exc


class ConnectionRepository(BaseRepository[Connection]):
    model = Connection

    async def find_between(
        self, a: PydanticObjectId, b: PydanticObjectId
    ) -> Connection | None:
        low, high = ordered_pair(a, b)
        return await Connection.find_one({"user_low": low, "user_high": high})

    async def get_for_member(
        self, connection_id: PydanticObjectId, user_id: PydanticObjectId
    ) -> Connection:
        """404 for a missing room and for someone else's room alike.

        One answer for both, so an outsider cannot probe which ids exist.
        """
        connection = await Connection.find_one(
            {"_id": connection_id, "participant_ids": user_id}
        )
        if connection is None:
            raise NotFoundError(detail="No such conversation.")
        return connection

    async def list_active(
        self, user_id: PydanticObjectId, *, limit: int, cursor: str | None
    ) -> tuple[list[Connection], str | None]:
        """Open rooms, most recent activity first, paged by (activity, _id)."""
        limit = max(1, min(limit, MAX_PAGE_SIZE))
        query: dict[str, Any] = {
            "participant_ids": user_id,
            "status": ConnectionStatus.ACCEPTED.value,
        }
        if cursor:
            at, last_id = decode_activity_cursor(cursor)
            query["$or"] = [
                {"last_activity_at": {"$lt": at}},
                {"last_activity_at": at, "_id": {"$lt": last_id}},
            ]
        rows = (
            await Connection.find(query)
            .sort("-last_activity_at", "-_id")
            .limit(limit + 1)
            .to_list()
        )
        items = rows[:limit]
        next_cursor = (
            encode_activity_cursor(items[-1].last_activity_at, items[-1].oid)
            if len(rows) > limit and items
            else None
        )
        return items, next_cursor

    async def unread_total(self, user_id: PydanticObjectId) -> int:
        pipeline: list[dict[str, Any]] = [
            {
                "$match": {
                    "participant_ids": user_id,
                    "status": ConnectionStatus.ACCEPTED.value,
                }
            },
            {"$unwind": "$members"},
            {"$match": {"members.user_id": user_id}},
            {"$group": {"_id": None, "n": {"$sum": "$members.unread_count"}}},
        ]
        rows = await Connection.aggregate(pipeline).to_list()
        return int(rows[0]["n"]) if rows else 0


class ChatMessageRepository(BaseRepository[ChatMessage]):
    model = ChatMessage

    async def find_by_client_id(
        self, sender_id: PydanticObjectId, client_id: str
    ) -> ChatMessage | None:
        return await ChatMessage.find_one(
            {"sender_id": sender_id, "client_id": client_id}
        )
