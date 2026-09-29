import importlib
import pkgutil
from typing import TYPE_CHECKING, Any

from beanie import Document, init_beanie
from bson.codec_options import CodecOptions
from pymongo import AsyncMongoClient

from app.core.config import Settings
from app.core.logging import get_logger

if TYPE_CHECKING:
    from pymongo.asynchronous.database import AsyncDatabase

log = get_logger(__name__)

# Every module appends its documents here at import time. init_beanie reads
# this one list, so registering a new collection is a single line rather than
# an edit to application startup.
DOCUMENT_MODELS: list[type[Document]] = []

_client: AsyncMongoClient | None = None  # type: ignore[type-arg]

# MongoDB stores UTC but returns naive datetimes by default. Comparing one to
# an aware datetime.now(UTC) raises TypeError, so make every read aware.
CODEC_OPTIONS: CodecOptions[dict[str, Any]] = CodecOptions(tz_aware=True)


def _discover_documents() -> None:
    """Import every `app.modules.<name>.models`, which registers its documents.

    Discovery rather than a hardcoded import list: a new module that forgets to
    add its line would have its collection silently missing from init_beanie,
    and the failure would surface much later as a confusing "collection not
    found" rather than at startup.
    """
    import app.modules

    for module in pkgutil.iter_modules(app.modules.__path__):
        if not module.ispkg:
            continue
        try:
            importlib.import_module(f"app.modules.{module.name}.models")
        except ModuleNotFoundError:
            # A module without a models.py is fine: not every feature stores
            # documents of its own.
            continue


async def init_database(settings: Settings) -> AsyncMongoClient:  # type: ignore[type-arg]
    global _client

    _discover_documents()

    _client = AsyncMongoClient(
        settings.mongodb_url,
        tz_aware=True,
        # Bounded, so an unreachable database fails the startup instead of
        # hanging it. A hung lifespan never reaches the health endpoint, so an
        # orchestrator sees a container that is neither ready nor failed and
        # waits forever; a crash is visible and gets restarted.
        serverSelectionTimeoutMS=settings.mongodb_timeout_ms,
    )
    database: AsyncDatabase = _client.get_database(  # type: ignore[type-arg]
        settings.mongodb_db, codec_options=CODEC_OPTIONS
    )
    try:
        await init_beanie(database=database, document_models=DOCUMENT_MODELS)
    except Exception as exc:
        log.error(
            "mongodb unreachable at startup",
            url=settings.mongodb_url.split("@")[-1],
            error=str(exc)[:200],
        )
        raise
    log.info(
        "mongodb connected",
        database=settings.mongodb_db,
        models=len(DOCUMENT_MODELS),
    )
    return _client


async def close_database() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None


def get_client() -> AsyncMongoClient:  # type: ignore[type-arg]
    if _client is None:
        raise RuntimeError("Database is not initialized; call init_database first")
    return _client


async def ping_database() -> bool:
    try:
        await get_client().admin.command("ping")
    except Exception as exc:
        # Log the cause: a health check that says "down" without saying why
        # turns a two-minute diagnosis into an hour of guessing.
        log.warning("mongodb ping failed", error=str(exc))
        return False
    return True
