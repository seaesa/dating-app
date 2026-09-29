from redis.asyncio import Redis

from app.core.config import Settings
from app.core.logging import get_logger

log = get_logger(__name__)

_redis: Redis | None = None


async def init_redis(settings: Settings) -> Redis:
    global _redis
    _redis = Redis.from_url(settings.redis_url, decode_responses=True)
    await _redis.ping()
    log.info("redis connected")
    return _redis


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None


def get_redis() -> Redis:
    if _redis is None:
        raise RuntimeError("Redis is not initialized; call init_redis first")
    return _redis


async def ping_redis() -> bool:
    try:
        await get_redis().ping()
    except Exception as exc:
        # Log the cause: a health check that says "down" without saying why
        # turns a two-minute diagnosis into an hour of guessing.
        log.warning("redis ping failed", error=str(exc))
        return False
    return True
