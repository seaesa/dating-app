import time
import uuid

from app.core.errors import RateLimitedError
from app.core.redis import get_redis


async def sliding_window(key: str, *, limit: int, window: int) -> None:
    """Allow `limit` events per `window` seconds, or raise RateLimitedError.

    A sorted set keyed by timestamp, not a counter: a fixed-window counter lets
    a caller send `limit` requests at the end of one window and `limit` more at
    the start of the next, which is twice the intended rate.
    """
    redis = get_redis()
    now = time.time()
    cutoff = now - window

    pipe = redis.pipeline()
    pipe.zremrangebyscore(key, 0, cutoff)
    pipe.zcard(key)
    pipe.expire(key, window)
    _, count, _ = await pipe.execute()

    if count >= limit:
        # Count BEFORE recording, and do not record a rejected attempt. Adding
        # it would let someone tapping "resend" push their own unlock further
        # away with every tap.
        raise RateLimitedError(
            detail="Too many requests. Try again shortly.", retry_after=window
        )

    await redis.zadd(key, {f"{now}:{uuid.uuid4().hex}": now})
