import os
from collections.abc import AsyncIterator
from typing import Any

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

# Defaults for the unit tests that build an app without touching a database
# (schemas, errors, config). The `settings` fixture below overrides these for
# tests that do talk to one.
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("JWT_SECRET", "test-secret-that-is-long-enough-x")
os.environ.setdefault("MONGODB_URL", "mongodb://localhost:27017")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")


@pytest.fixture(scope="session")
def settings() -> Any:
    """Point the suite at the development stack.

    Real MongoDB and Redis, not mocks: these tests exist to check unique
    indexes, geospatial queries and projections, which a mock fakes rather than
    enforces. They run against `docker compose` rather than per-run containers
    because MongoDB needs a replica set for transactions, and initiating one
    inside an ephemeral container means the member address it advertises is
    unreachable from the host.

    A dedicated database name keeps the suite from touching development data,
    and the suite empties it between tests.
    """
    from app.core.config import Settings

    return Settings(
        ENVIRONMENT="test",
        MONGODB_URL=os.environ.get(
            "TEST_MONGODB_URL",
            "mongodb://localhost:27017/?replicaSet=rs0&directConnection=true",
        ),
        MONGODB_DB="terdin_test",
        REDIS_URL=os.environ.get("TEST_REDIS_URL", "redis://localhost:6379/1"),
        JWT_SECRET="test-secret-that-is-long-enough-for-tests",
        SMS_PROVIDER="console",
        S3_ENDPOINT=os.environ.get("TEST_S3_ENDPOINT", "http://localhost:8333"),
        S3_ACCESS_KEY="terdin-local",
        S3_SECRET_KEY="terdin-local-secret",
        S3_BUCKET="terdin-test",
    )


@pytest_asyncio.fixture
async def app(settings: Any) -> AsyncIterator[FastAPI]:
    """A running application with its lifespan open.

    Emptying the collections is teardown HERE rather than an autouse fixture:
    autouse would drag a MongoDB and a Redis container into the pure unit tests
    (schemas, config, error shapes), which need neither and would go from
    milliseconds to tens of seconds.
    """
    from app.core.db import DOCUMENT_MODELS
    from app.core.redis import get_redis
    from app.main import create_app

    application = create_app(settings)
    async with application.router.lifespan_context(application):
        try:
            yield application
        finally:
            # Delete rather than drop: dropping discards the indexes
            # init_beanie built, and a later uniqueness test would then pass
            # because nothing was enforcing uniqueness.
            for model in DOCUMENT_MODELS:
                await model.get_pymongo_collection().delete_many({})
            await get_redis().flushdb()


@pytest_asyncio.fixture
async def client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def clean_db(app: FastAPI) -> AsyncIterator[None]:
    """Explicit name for tests that touch the database without a client."""
    yield


@pytest.fixture
def auth_header(settings: Any) -> Any:
    """Mint a real access token, so tests exercise the production dependency."""
    from app.core.security import create_access_token

    def _header(user: Any) -> dict[str, str]:
        return {"Authorization": f"Bearer {create_access_token(str(user.id), settings)}"}

    return _header


@pytest.fixture
def last_otp() -> Any:
    """Read the code the console provider recorded.

    Tests never need the code in a response body, which is what lets the API
    keep it out of one entirely.
    """
    from app.modules.auth.sms.console import ConsoleSmsProvider

    ConsoleSmsProvider.sent.clear()

    def _last(phone: str) -> str:
        code = ConsoleSmsProvider.sent.get(phone)
        assert code is not None, f"no OTP was sent to {phone}"
        return code

    return _last
