import asyncio

from beanie import PydanticObjectId
from redis.exceptions import RedisError

from app.core.config import Settings
from app.core.db import close_database, init_database
from app.core.logging import get_logger
from app.core.redis import close_redis, get_redis, init_redis
from app.modules.media.face_check import (
    JOB_QUEUE,
    RESULT_KEY,
    RESULT_TTL_SECONDS,
    FaceDetector,
)
from app.modules.media.models import FaceCheck, MediaAsset
from app.modules.media.storage import MediaStorage

log = get_logger(__name__)

# Below the Redis client's 5 s socket timeout; see verification/worker.py.
POP_TIMEOUT_SECONDS = 2
RETRY_DELAY_SECONDS = 2


async def process_job(
    raw: str | bytes, detector: FaceDetector, storage: MediaStorage
) -> FaceCheck | None:
    """Check one photo and record the verdict; None when there is nothing to do."""
    if isinstance(raw, bytes):
        raw = raw.decode()
    asset = await MediaAsset.get(PydanticObjectId(raw))
    if asset is None or asset.face_check is not FaceCheck.PENDING:
        return None
    try:
        data = await storage.read(asset.key)
        # A few milliseconds of CPU, off the event loop so the Redis
        # connection keeps being served.
        reason = await asyncio.to_thread(detector.check, data)
    except Exception:
        # Our failure, not a verdict on the photo: the app asks for another try.
        log.exception("face_check.failed", media_id=raw)
        reason = "error"
    verdict = FaceCheck.PASSED if reason is None else FaceCheck.FAILED
    # Targeted, and only while still pending: a re-confirm racing this job
    # must not have its verdict overwritten by a stale copy of the document.
    await MediaAsset.find_one(
        {"_id": asset.oid, "face_check": FaceCheck.PENDING.value}
    ).update({"$set": {"face_check": verdict.value, "face_check_reason": reason}})
    key = RESULT_KEY.format(media_id=raw)
    await get_redis().lpush(key, verdict.value)
    await get_redis().expire(key, RESULT_TTL_SECONDS)
    log.info("face_check.done", media_id=raw, verdict=verdict.value, reason=reason)
    return verdict


async def run_worker(settings: Settings) -> None:
    """Check profile photos off the queue, one at a time, until stopped.

    A separate process so OpenCV never shares a CPU with request handling.
    One photo takes milliseconds; scale by running more workers.
    """
    await init_database(settings)
    await init_redis(settings)
    detector = FaceDetector(settings)
    storage = MediaStorage(settings)
    log.info("face_check.worker.started", queue=JOB_QUEUE)
    try:
        while True:
            try:
                item = await get_redis().brpop([JOB_QUEUE], timeout=POP_TIMEOUT_SECONDS)
            except RedisError:
                log.exception("face_check.worker.redis_unavailable")
                await asyncio.sleep(RETRY_DELAY_SECONDS)
                continue
            if item is None:
                continue
            try:
                await process_job(item[1], detector, storage)
            except Exception:
                log.exception("face_check.worker.job_failed")
    finally:
        await close_redis()
        await close_database()


def main(settings: Settings) -> None:
    asyncio.run(run_worker(settings))
