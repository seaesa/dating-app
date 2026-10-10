import asyncio
import contextlib
from typing import TYPE_CHECKING, cast

from redis.asyncio.client import PubSub
from redis.exceptions import RedisError
from starlette.websockets import WebSocket

from app.core.logging import get_logger
from app.core.redis import get_redis
from app.modules.realtime.events import user_channel

if TYPE_CHECKING:
    from collections.abc import Awaitable, Callable

log = get_logger(__name__)

IDLE_SLEEP_SECONDS = 0.5
READ_TIMEOUT_SECONDS = 1.0


class RealtimeHub:
    """Fan Redis messages out to this process's sockets.

    One pub/sub connection per process rather than one per socket: a channel is
    subscribed when a user's first socket opens and dropped when the last closes.
    """

    def __init__(self) -> None:
        self._sockets: dict[str, set[WebSocket]] = {}
        self._pubsub: PubSub | None = None
        self._reader: asyncio.Task[None] | None = None
        # One PubSub connection is not safe for concurrent (un)subscribes: two
        # sockets of one user opening together would both subscribe at once and
        # corrupt its channel state. Membership changes run one at a time.
        self._membership = asyncio.Lock()

    async def attach(self, user_id: str, socket: WebSocket) -> None:
        # Subscribe before registering: if Redis fails here, the user must not
        # be left looking subscribed, or no later socket would ever subscribe.
        async with self._membership:
            if not self._sockets.get(user_id):
                await self._ensure_pubsub().subscribe(user_channel(user_id))
            self._sockets.setdefault(user_id, set()).add(socket)

    async def detach(self, user_id: str, socket: WebSocket) -> None:
        async with self._membership:
            sockets = self._sockets.get(user_id)
            if sockets is None:
                return
            sockets.discard(socket)
            if not sockets:
                del self._sockets[user_id]
                if self._pubsub is not None:
                    await self._pubsub.unsubscribe(user_channel(user_id))

    def _ensure_pubsub(self) -> PubSub:
        if self._pubsub is None:
            self._pubsub = get_redis().pubsub(ignore_subscribe_messages=True)
            self._reader = asyncio.create_task(self._read(self._pubsub))
        return self._pubsub

    async def _read(self, pubsub: PubSub) -> None:
        while True:
            if not pubsub.subscribed:
                await asyncio.sleep(IDLE_SLEEP_SECONDS)
                continue
            try:
                message = await pubsub.get_message(
                    ignore_subscribe_messages=True, timeout=READ_TIMEOUT_SECONDS
                )
            except RedisError:
                log.exception("realtime.hub.redis_unavailable")
                await asyncio.sleep(IDLE_SLEEP_SECONDS)
                continue
            if message is None or message.get("type") != "message":
                continue
            user_id = str(message["channel"]).removeprefix("u:")
            for socket in list(self._sockets.get(user_id, ())):
                with contextlib.suppress(Exception):
                    await socket.send_text(str(message["data"]))

    async def close(self) -> None:
        if self._reader is not None:
            self._reader.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._reader
        if self._pubsub is not None:
            # redis-py leaves aclose() unannotated; reset() is its deprecated alias.
            aclose = cast("Callable[[], Awaitable[None]]", self._pubsub.aclose)
            with contextlib.suppress(RedisError):
                await aclose()
        self._sockets.clear()
        self._pubsub = None
        self._reader = None
        # A lock binds to the loop it is first used on; tests run one per test.
        self._membership = asyncio.Lock()


hub = RealtimeHub()
