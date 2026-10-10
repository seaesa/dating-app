import json
from datetime import UTC, datetime
from enum import StrEnum

from beanie import PydanticObjectId

from app.core.redis import get_redis
from app.modules.notifications.models import PushDevice
from app.modules.notifications.schemas import PushDeviceBody
from app.modules.realtime.events import is_online
from app.modules.users.models import User

PUSH_QUEUE = "push:jobs"
# Ten messages in a minute produce one push, not ten.
THROTTLE_SECONDS = 60


class PushKind(StrEnum):
    MESSAGE = "message"
    REVEAL_REQUEST = "reveal_request"
    REVEAL_GRANTED = "reveal_granted"


async def enqueue_push(
    user_id: PydanticObjectId, connection_id: PydanticObjectId, kind: PushKind
) -> bool:
    """Queue a push unless the user has a socket open or was pushed just now."""
    if await is_online(user_id):
        return False
    redis = get_redis()
    throttle = f"push:thr:{user_id}:{connection_id}:{kind.value}"
    if not await redis.set(throttle, "1", ex=THROTTLE_SECONDS, nx=True):
        return False
    job = {"userId": str(user_id), "connectionId": str(connection_id), "kind": kind.value}
    await redis.lpush(PUSH_QUEUE, json.dumps(job))
    return True


class PushDeviceService:
    async def register(self, user: User, body: PushDeviceBody) -> None:
        """Upsert by token: a phone that changes account changes owner."""
        await PushDevice.get_pymongo_collection().update_one(
            {"token": body.token},
            {
                "$set": {
                    "user_id": user.oid,
                    "platform": body.platform.value,
                    "updated_at": datetime.now(UTC),
                }
            },
            upsert=True,
        )

    async def unregister(self, user: User, token: str) -> None:
        await PushDevice.find({"token": token, "user_id": user.oid}).delete()
