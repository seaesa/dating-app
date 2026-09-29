from typing import Any

import aioboto3
from botocore.config import Config

from app.core.config import Settings


class MediaStorage:
    """S3-compatible object storage.

    SeaweedFS locally, R2 or S3 in production — the same API, so switching is
    an environment change rather than a code change.
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._session = aioboto3.Session()

    def _client(self) -> Any:
        return self._session.client(
            "s3",
            endpoint_url=self.settings.s3_endpoint,
            aws_access_key_id=self.settings.s3_access_key,
            aws_secret_access_key=self.settings.s3_secret_key,
            region_name=self.settings.s3_region,
            # Path addressing: a virtual-host style bucket name is not
            # resolvable against a local endpoint.
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )

    async def presign_put(self, key: str, content_type: str) -> str:
        async with self._client() as s3:
            url: str = await s3.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.settings.s3_bucket,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=self.settings.s3_presign_ttl,
            )
            return url

    async def presign_get(self, key: str, *, expires_in: int | None = None) -> str:
        async with self._client() as s3:
            url: str = await s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.settings.s3_bucket, "Key": key},
                ExpiresIn=expires_in or self.settings.s3_presign_ttl,
            )
            return url

    async def head(self, key: str) -> dict[str, Any] | None:
        async with self._client() as s3:
            try:
                result: dict[str, Any] = await s3.head_object(
                    Bucket=self.settings.s3_bucket, Key=key
                )
                return result
            except Exception:
                return None

    async def ensure_bucket(self) -> None:
        async with self._client() as s3:
            try:
                await s3.head_bucket(Bucket=self.settings.s3_bucket)
            except Exception:
                await s3.create_bucket(Bucket=self.settings.s3_bucket)
