import json
from collections.abc import Iterable
from typing import Any

from app.core.redis import get_redis

# A socket pings every 25 s; two missed pings and the user counts as offline.
PRESENCE_TTL_SECONDS = 60


def user_channel(user_id: object) -> str:
    return f"u:{user_id}"


def presence_key(user_id: object) -> str:
    """Internal only: decides whether to push. Never exposed by any API."""
    return f"ws:{user_id}"


async def publish(
    user_ids: Iterable[object], event_type: str, data: dict[str, Any]
) -> None:
    payload = json.dumps({"type": event_type, "data": data})
    pipe = get_redis().pipeline(transaction=False)
    for user_id in user_ids:
        pipe.publish(user_channel(user_id), payload)
    await pipe.execute()


async def mark_connected(user_id: str) -> None:
    pipe = get_redis().pipeline(transaction=False)
    pipe.incr(presence_key(user_id))
    pipe.expire(presence_key(user_id), PRESENCE_TTL_SECONDS)
    await pipe.execute()


async def refresh_presence(user_id: str) -> None:
    await get_redis().expire(presence_key(user_id), PRESENCE_TTL_SECONDS)


async def mark_disconnected(user_id: str) -> None:
    redis = get_redis()
    remaining = await redis.decr(presence_key(user_id))
    if remaining <= 0:
        await redis.delete(presence_key(user_id))


async def is_online(user_id: object) -> bool:
    return bool(await get_redis().exists(presence_key(user_id)))
