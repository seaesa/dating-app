import httpx
import pytest
import pytest_asyncio
from beanie import init_beanie
from pymongo import AsyncMongoClient

from app.core.config import Settings
from app.core.db import CODEC_OPTIONS, DOCUMENT_MODELS, _discover_documents
from app.core.redis import close_redis, init_redis
from app.core.security import create_access_token
from app.main import create_app
from app.modules.users.models import User

MONGO_URL = "mongodb://localhost:27017/?replicaSet=rs0&directConnection=true"


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_test_db():
    """Initialize Beanie on the test database and empty every collection."""
    _discover_documents()
    client = AsyncMongoClient(MONGO_URL)
    test_db = client.get_database("terdin_date_test", codec_options=CODEC_OPTIONS)
    await init_beanie(database=test_db, document_models=DOCUMENT_MODELS)

    for model in DOCUMENT_MODELS:
        await model.delete_all()

    yield test_db

    for model in DOCUMENT_MODELS:
        await model.delete_all()
    await client.close()


@pytest.fixture
def settings() -> Settings:
    return Settings(
        environment="development",
        jwt_secret="test-secret-key-that-is-at-least-32-chars-long",  # noqa: S106
        mongodb_url=MONGO_URL,
        mongodb_db="terdin_date_test",
        redis_url="redis://localhost:6379/1",
    )


@pytest.fixture
def chat_app(settings: Settings):
    return create_app(settings)


@pytest_asyncio.fixture
async def redis(settings: Settings):
    """Redis db 1, empty, plus a clean realtime hub bound to this event loop."""
    from app.modules.realtime.hub import hub

    client = await init_redis(settings)
    await client.flushdb()
    yield client
    await hub.close()
    await client.flushdb()
    await close_redis()


@pytest_asyncio.fixture
async def api(chat_app, redis):
    """HTTP client on the app, without running its lifespan.

    WebSocket tests build their own client inside the test body: httpx-ws's
    transport holds a task group that cannot be torn down from a fixture.
    """
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=chat_app), base_url="http://test"
    ) as client:
        yield client


@pytest.fixture
def bearer(settings: Settings):
    def _headers(user: User) -> dict[str, str]:
        token = create_access_token(str(user.oid), settings)
        return {"Authorization": f"Bearer {token}"}

    return _headers
