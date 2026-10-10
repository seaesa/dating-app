import asyncio
import json
from typing import Any

import httpx
from beanie import PydanticObjectId
from redis.exceptions import RedisError

from app.core.config import Settings
from app.core.db import close_database, init_database
from app.core.logging import get_logger
from app.core.redis import close_redis, get_redis, init_redis
from app.modules.notifications.models import PushDevice
from app.modules.notifications.service import PUSH_QUEUE, PushKind

log = get_logger(__name__)

# Expo accepts at most 100 messages per request.
BATCH_SIZE = 100
# Below redis-py's socket timeout, as in the verification worker.
POP_TIMEOUT_SECONDS = 2
RETRY_DELAY_SECONDS = 2
# Generic on purpose: a lock screen is readable by anyone holding the phone.
PUSH_COPY: dict[PushKind, str] = {
    PushKind.MESSAGE: "Bạn có tin nhắn mới",
    PushKind.REVEAL_REQUEST: "Bạn có yêu cầu mới trong cuộc trò chuyện",
    PushKind.REVEAL_GRANTED: "Yêu cầu của bạn đã được đồng ý",
}


async def build_messages(
    jobs: list[dict[str, str]], title: str
) -> list[tuple[str, dict[str, Any]]]:
    """(token, Expo message) for every device of every job's user, one query."""
    user_ids = list({PydanticObjectId(job["userId"]) for job in jobs})
    devices = await PushDevice.find({"user_id": {"$in": user_ids}}).to_list()
    tokens: dict[str, list[str]] = {}
    for device in devices:
        tokens.setdefault(str(device.user_id), []).append(device.token)
    messages: list[tuple[str, dict[str, Any]]] = []
    for job in jobs:
        body = PUSH_COPY[PushKind(job["kind"])]
        for token in tokens.get(job["userId"], []):
            messages.append(
                (
                    token,
                    {
                        "to": token,
                        "title": title,
                        "body": body,
                        "sound": "default",
                        "data": {"connectionId": job["connectionId"]},
                    },
                )
            )
    return messages


async def send_batch(
    client: httpx.AsyncClient,
    messages: list[tuple[str, dict[str, Any]]],
    settings: Settings,
) -> None:
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if settings.expo_access_token:
        headers["Authorization"] = f"Bearer {settings.expo_access_token}"
    for start in range(0, len(messages), BATCH_SIZE):
        chunk = messages[start : start + BATCH_SIZE]
        response = await client.post(
            settings.expo_push_url, json=[m for _, m in chunk], headers=headers
        )
        response.raise_for_status()
        tickets = response.json()["data"]
        dead: list[str] = []
        for (token, _), ticket in zip(chunk, tickets, strict=True):
            if ticket.get("status") != "error":
                continue
            error = ticket.get("details", {}).get("error")
            if error == "DeviceNotRegistered":
                dead.append(token)
            else:
                # Credentials, size or rate errors: nothing a retry fixes, and
                # silence here means push is down with nobody told.
                log.error("push.ticket_error", error=error, message=ticket.get("message"))
        if dead:
            await PushDevice.find({"token": {"$in": dead}}).delete()


async def process_batch(
    first_raw: str | bytes, client: httpx.AsyncClient, settings: Settings
) -> None:
    """One popped job plus whatever else is already waiting, sent together."""
    rest = await get_redis().rpop(PUSH_QUEUE, BATCH_SIZE - 1) or []
    jobs = [json.loads(raw) for raw in [first_raw, *rest]]
    messages = await build_messages(jobs, settings.app_name)
    if messages:
        await send_batch(client, messages, settings)


async def run_push_worker(settings: Settings) -> None:
    """Block on the queue; wake only when the API pushes a job."""
    await init_database(settings)
    await init_redis(settings)
    log.info("push.worker.started", queue=PUSH_QUEUE)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            while True:
                try:
                    item = await get_redis().brpop(
                        [PUSH_QUEUE], timeout=POP_TIMEOUT_SECONDS
                    )
                except RedisError:
                    log.exception("push.worker.redis_unavailable")
                    await asyncio.sleep(RETRY_DELAY_SECONDS)
                    continue
                if item is None:
                    continue
                _, raw = item
                try:
                    await process_batch(raw, client, settings)
                except Exception:
                    # A push is best effort; a failed batch must not stop the loop.
                    log.exception("push.worker.batch_failed")
    finally:
        await close_redis()
        await close_database()


def main(settings: Settings) -> None:
    asyncio.run(run_push_worker(settings))
