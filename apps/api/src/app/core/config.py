from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    environment: Literal["development", "production"] = "development"

    # Database
    mongodb_url: str
    # Shown to users (SMS, push, API docs). Set APP_NAME to rebrand.
    app_name: str = "Terdin"
    mongodb_db: str = "terdin_date"
    mongodb_timeout_ms: int = 5000
    redis_url: str

    # Auth
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_ttl: Annotated[int, Field(description="seconds")] = 60 * 15
    refresh_token_ttl: Annotated[int, Field(description="seconds")] = 60 * 60 * 24 * 30

    # OTP
    otp_ttl: int = 300
    otp_length: int = 6
    otp_max_attempts: int = 5
    sms_provider: Literal["console", "twilio"] = "console"
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

    # Face verification. Off until the worker is deployed: the API then refuses
    # challenges and the app hides the feature.
    verification_enabled: bool = False
    verification_max_attempts_per_day: int = 3
    verification_challenge_ttl: int = 120
    # A submission still `pending` after this long was lost with its worker.
    verification_pending_timeout: int = 600
    # distance / model threshold: at or under this ratio the face matches. There
    # is no manual review, so anything above it is refused and the user retries.
    verification_auto_ratio: float = 0.8
    # Head pose from the eye/nose landmarks; calibrated in the DeepFace spike.
    verification_yaw_straight_max: float = 0.12
    verification_yaw_turn_min: float = 0.25

    # Object storage
    s3_endpoint: str = "http://localhost:8333"
    s3_region: str = "us-east-1"
    s3_bucket: str = "terdin-media"
    # The local stack's credentials, so `pnpm services:up` works with no setup.
    # `_reject_dev_defaults_in_production` below refuses them outside development.
    s3_access_key: str = "terdin-local"
    s3_secret_key: str = "terdin-local-secret"  # noqa: S105 - dev default, guarded below
    s3_public_base_url: str = "http://localhost:8333/terdin-media"
    # Private media: short-lived, so a leaked URL expires quickly.
    s3_presign_ttl: int = 300
    # Public media: the same mechanism with a long lifetime, so avatars stay
    # cacheable. Signing both keeps one code path and means local development
    # behaves exactly like production, rather than serving public objects
    # unsigned locally and only discovering the difference in staging.
    s3_public_presign_ttl: int = 60 * 60 * 24
    media_max_bytes: int = 10 * 1024 * 1024

    # Push. The access token is optional: Expo accepts unauthenticated sends
    # unless "enhanced security" is switched on for the project.
    expo_push_url: str = "https://exp.host/--/api/v2/push/send"
    expo_access_token: str = ""

    # HTTP
    # NoDecode because pydantic-settings JSON-decodes complex types from a
    # dotenv source BEFORE field validators run, so a plain comma-separated
    # CORS_ORIGINS raises a parse error the `mode="before"` validator never
    # sees. Constructing Settings(...) directly takes a different code path,
    # which is why this only failed against a real .env file.
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:3000",
        "http://localhost:8081",
    ]
    log_level: str = "INFO"
    log_json: bool = False

    @field_validator("jwt_secret")
    @classmethod
    def _secret_is_long_enough(cls, value: str) -> str:
        # A short secret is brute-forceable, which is an authentication bypass
        # that leaves no trace in the logs.
        if len(value) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters")
        return value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [o.strip() for o in value.split(",") if o.strip()]
        return value

    @model_validator(mode="after")
    def _reject_dev_defaults_in_production(self) -> "Settings":
        """Refuse to boot production on a credential anyone can look up.

        A default that merely *works* in production is the failure mode here:
        nothing surfaces until the bucket is already readable by strangers.
        """
        if self.environment != "production":
            return self
        insecure = [
            name
            for name, value in (
                ("S3_ACCESS_KEY", self.s3_access_key),
                ("S3_SECRET_KEY", self.s3_secret_key),
            )
            if value.startswith("terdin-local")
        ]
        if self.sms_provider == "console":
            # The console provider sends nothing and logs the live code. In
            # production that is both a silent outage and a credential in the
            # log file.
            insecure.append("SMS_PROVIDER=console")
        if insecure:
            raise ValueError(
                f"{', '.join(insecure)} still hold the local development default; "
                "set real credentials before running in production"
            )
        return self

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
