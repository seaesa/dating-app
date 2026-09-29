from typing import Any

import pytest

from app.core.config import Settings


def test_reads_from_environment() -> None:
    settings = Settings(
        JWT_SECRET="x" * 32,
        MONGODB_URL="mongodb://localhost:27017",
        REDIS_URL="redis://localhost:6379/0",
    )
    assert settings.mongodb_db == "terdin_date"


def test_rejects_a_short_jwt_secret() -> None:
    """A 32-byte floor: a guessable secret is a silent authentication bypass."""
    with pytest.raises(ValueError, match="at least 32"):
        Settings(
            JWT_SECRET="short",
            MONGODB_URL="mongodb://localhost:27017",
            REDIS_URL="redis://localhost:6379/0",
        )


def test_cors_origins_parses_a_comma_separated_list() -> None:
    settings = Settings(
        JWT_SECRET="x" * 32,
        MONGODB_URL="mongodb://localhost:27017",
        REDIS_URL="redis://localhost:6379/0",
        CORS_ORIGINS="http://localhost:3000,http://localhost:8081",
    )
    assert settings.cors_origins == ["http://localhost:3000", "http://localhost:8081"]


def test_production_refuses_the_minio_development_credentials() -> None:
    """A default that merely works in production is the dangerous case: nothing
    surfaces until the bucket is already readable by strangers."""
    with pytest.raises(ValueError, match="S3_SECRET_KEY"):
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET="x" * 32,
            MONGODB_URL="mongodb://localhost:27017",
            REDIS_URL="redis://localhost:6379/0",
        )


def test_development_allows_them_so_local_setup_needs_no_secrets() -> None:
    settings = Settings(
        ENVIRONMENT="development",
        JWT_SECRET="x" * 32,
        MONGODB_URL="mongodb://localhost:27017",
        REDIS_URL="redis://localhost:6379/0",
    )
    assert settings.s3_access_key == "terdin-local"


def test_cors_origins_parses_from_a_real_dotenv_file(tmp_path: Any) -> None:
    """Exercise the dotenv source, not just direct construction.

    pydantic-settings decodes complex types differently per source: a list
    field arrives JSON-decoded from a dotenv file but raw from an init
    argument. A test that only constructs Settings(...) passes while the app
    refuses to boot.
    """
    env = tmp_path / ".env"
    env.write_text(
        "MONGODB_URL=mongodb://localhost:27017\n"
        "REDIS_URL=redis://localhost:6379/0\n"
        f"JWT_SECRET={'x' * 32}\n"
        "CORS_ORIGINS=http://a.test,http://b.test\n"
    )

    settings = Settings(_env_file=str(env))  # type: ignore[call-arg]

    assert settings.cors_origins == ["http://a.test", "http://b.test"]
