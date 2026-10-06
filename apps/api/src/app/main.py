from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import Settings, get_settings
from app.core.db import close_database, init_database, ping_database
from app.core.errors import ERROR_RESPONSES, install_error_handlers
from app.core.logging import configure_logging
from app.core.middleware import install_middleware
from app.core.redis import close_redis, init_redis, ping_redis


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the application.

    A factory rather than a module-level singleton: the CLI builds one without
    starting a server.
    """
    resolved = settings or get_settings()
    configure_logging(level=resolved.log_level, json=resolved.log_json)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        await init_database(resolved)
        await init_redis(resolved)
        yield
        await close_redis()
        await close_database()

    app = FastAPI(
        title="Terdin Date API",
        version="0.1.0",
        openapi_url="/openapi.json",
        docs_url=None if resolved.is_production else "/docs",
        lifespan=lifespan,
        responses=ERROR_RESPONSES,
        separate_input_output_schemas=False,
    )

    app.state.settings = resolved

    install_middleware(app, resolved)
    install_error_handlers(app)

    from app.api.v1 import api_router

    app.include_router(api_router)

    @app.get("/health", tags=["meta"], operation_id="health")
    async def health() -> dict[str, str]:
        # Reports dependency state rather than just process liveness, so an
        # orchestrator restarts a container that lost its database.
        mongo_ok = await ping_database()
        redis_ok = await ping_redis()
        return {
            "status": "ok" if mongo_ok and redis_ok else "degraded",
            "mongodb": "ok" if mongo_ok else "down",
            "redis": "ok" if redis_ok else "down",
        }

    return app
