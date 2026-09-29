import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from starlette.middleware.cors import CORSMiddleware

from app.core.config import Settings
from app.core.logging import get_logger, set_request_id

log = get_logger(__name__)

Handler = Callable[[Request], Awaitable[Response]]


def install_middleware(app: FastAPI, settings: Settings) -> None:
    @app.middleware("http")
    async def request_context(request: Request, call_next: Handler) -> Response:
        # Honour a client-supplied id so one identifier spans client and server
        # logs; generate one when absent.
        request_id = request.headers.get("X-Request-Id") or uuid.uuid4().hex
        set_request_id(request_id)

        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000

        response.headers["X-Request-Id"] = request_id
        log.info(
            "request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=round(elapsed_ms, 2),
        )
        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        # False because the refresh token lives in localStorage, not a cookie
        # (spec §10). Enabling it is part of the cookie upgrade path, not
        # something to turn on speculatively.
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-Id"],
    )
