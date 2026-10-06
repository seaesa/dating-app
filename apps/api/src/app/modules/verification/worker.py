import asyncio

from redis.exceptions import RedisError

from app.core.config import Settings
from app.core.db import close_database, init_database
from app.core.logging import get_logger
from app.core.redis import close_redis, get_redis, init_redis
from app.modules.verification.service import JOB_QUEUE, VerificationService

log = get_logger(__name__)

# How long one blocking pop waits before looping. Must stay below the Redis
# client's socket timeout (5 s by default in redis-py), or an empty queue reads
# as a dead connection and raises TimeoutError.
POP_TIMEOUT_SECONDS = 2
RETRY_DELAY_SECONDS = 2


async def run_worker(settings: Settings) -> None:
    """Take verification jobs off the queue, one at a time, until stopped.

    A separate process from the API: TensorFlow needs 1 to 2 GB of memory and
    seconds of CPU per job, which would starve request handling in the API.
    A job lost with a crashed worker stays `pending` until
    `verification_pending_timeout`, after which the user can retry.
    """
    await init_database(settings)
    await init_redis(settings)
    service = VerificationService(settings)
    log.info("verification.worker.started", queue=JOB_QUEUE)
    try:
        while True:
            try:
                item = await get_redis().brpop([JOB_QUEUE], timeout=POP_TIMEOUT_SECONDS)
            except RedisError:
                # A Redis restart must not end the worker; wait and reconnect.
                log.exception("verification.worker.redis_unavailable")
                await asyncio.sleep(RETRY_DELAY_SECONDS)
                continue
            if item is None:
                continue
            _, raw = item
            try:
                await service.process_job(raw)
            except Exception:
                # _process already records failures; this only keeps the loop
                # alive if a job is malformed.
                log.exception("verification.worker.job_failed")
    finally:
        await close_redis()
        await close_database()


def main(settings: Settings) -> None:
    asyncio.run(run_worker(settings))
