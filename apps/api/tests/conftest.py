import pytest_asyncio
from beanie import init_beanie
from pymongo import AsyncMongoClient

from app.core.db import CODEC_OPTIONS, DOCUMENT_MODELS, _discover_documents
from app.modules.interactions.models import UserInteraction
from app.modules.users.models import User


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_test_db():
    """Initialize Beanie ODM with test database for tests requiring document models."""
    _discover_documents()
    client = AsyncMongoClient(
        "mongodb://localhost:27017/?replicaSet=rs0&directConnection=true"
    )
    test_db = client.get_database("terdin_date_test", codec_options=CODEC_OPTIONS)
    await init_beanie(database=test_db, document_models=DOCUMENT_MODELS)

    # Clean collections before test
    await User.delete_all()
    await UserInteraction.delete_all()

    yield test_db

    # Clean collections after test
    await User.delete_all()
    await UserInteraction.delete_all()
    await client.close()
