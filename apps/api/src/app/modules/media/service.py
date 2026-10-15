import uuid

from beanie import PydanticObjectId
from redis.exceptions import RedisError

from app.core.config import Settings
from app.core.errors import ForbiddenError, NotFoundError, ValidationError
from app.core.logging import get_logger
from app.core.redis import get_redis
from app.modules.media.face_check import JOB_QUEUE, RESULT_KEY
from app.modules.media.models import FaceCheck, MediaAsset, MediaKind, MediaStatus
from app.modules.media.schemas import UploadUrlResponse
from app.modules.media.storage import MediaStorage

log = get_logger(__name__)

EXTENSION = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
}


class MediaService:
    def __init__(self, settings: Settings, storage: MediaStorage | None = None) -> None:
        self.settings = settings
        self.storage = storage or MediaStorage(settings)

    async def create_upload_url(
        self,
        owner_id: PydanticObjectId,
        kind: MediaKind,
        content_type: str,
        size: int,
    ) -> UploadUrlResponse:
        if size > self.settings.media_max_bytes:
            raise ValidationError(
                detail="That file is too large.",
                errors={
                    "size": [f"must be at most {self.settings.media_max_bytes} bytes"]
                },
            )

        key = f"{kind.value}/{owner_id}/{uuid.uuid4().hex}.{EXTENSION[content_type]}"
        asset = await MediaAsset(
            owner_id=owner_id,
            kind=kind,
            key=key,
            content_type=content_type,
            size=size,
        ).insert()

        return UploadUrlResponse(
            media_id=asset.oid,
            upload_url=await self.storage.presign_put(key, content_type),
            expires_in=self.settings.s3_presign_ttl,
        )

    async def confirm(
        self, media_id: PydanticObjectId, owner_id: PydanticObjectId
    ) -> None:
        asset = await MediaAsset.get(media_id)
        if asset is None:
            raise NotFoundError(detail="No such media.")
        if asset.owner_id != owner_id:
            raise ForbiddenError(detail="That media belongs to another account.")

        head = await self.storage.head(asset.key)
        if head is None:
            raise ValidationError(
                detail="The upload was not found in storage.",
                errors={"mediaId": ["not uploaded"]},
            )
        # Trust the object, not the client's claim: the declared size was only
        # ever a hint for validation.
        asset.size = int(head.get("ContentLength", asset.size))
        asset.status = MediaStatus.READY
        checks_face = self.settings.face_check_enabled and asset.kind is MediaKind.PRIVATE
        if checks_face and asset.face_check is None:
            asset.face_check = FaceCheck.PENDING
        await asset.save()
        if asset.face_check is FaceCheck.PENDING:
            await self._await_face_check(asset.oid)

    async def _await_face_check(self, media_id: PydanticObjectId) -> None:
        """Queue the photo for the worker and wait, briefly, for its verdict.

        The wait blocks this request only, never the event loop, and the worker
        does the CPU work: an upload that is confirmed has its verdict in the
        same round trip. Past the wait the verdict lands later, still in time
        for the check when the photo becomes the main one.
        """
        try:
            redis = get_redis()
            await redis.lpush(JOB_QUEUE, str(media_id))
            await redis.blpop(
                [RESULT_KEY.format(media_id=media_id)],
                timeout=self.settings.face_check_wait_seconds,
            )
        except RedisError:
            log.warning("face_check.enqueue_failed", media_id=str(media_id))

    async def main_photo_problem(self, media_id: PydanticObjectId) -> str | None:
        """Why this photo cannot be a main photo, or None when it can.

        Unchecked photos (the check switched off, or uploaded before it) pass.
        """
        asset = await MediaAsset.get(media_id)
        if asset is None or asset.face_check in (None, FaceCheck.PASSED):
            return None
        if asset.face_check is FaceCheck.PENDING:
            return "face_check_pending"
        return asset.face_check_reason or "no_face"

    def _ttl_for(self, kind: MediaKind) -> int:
        """Public media is cacheable for a day; private expires in minutes.

        Same signing mechanism either way, so local development behaves like
        production. The lifetime is what expresses the security difference.
        """
        return (
            self.settings.s3_public_presign_ttl
            if kind is MediaKind.PUBLIC
            else self.settings.s3_presign_ttl
        )

    def _may_sign(
        self, asset: MediaAsset, owner_id: PydanticObjectId, *, allow_private: bool
    ) -> bool:
        """Decide whether this asset may be signed for this viewer.

        A media id is a reference the client supplies, never a capability:
        nothing stops someone PATCHing another user's id into their own
        profile. Two rules close that:

        - Ownership. Signing a key the referring user does not own would let
          any account turn a stranger's private photo into a working URL.
        - Kind. Only a `public/` key may be signed into a publicly visible
          field, even for its owner, because the avatar is rendered to
          anonymous viewers.
        """
        if asset.owner_id != owner_id:
            return False
        return asset.kind is MediaKind.PUBLIC or allow_private

    async def signed_for(
        self, media_ids: list[PydanticObjectId], *, owner_id: PydanticObjectId
    ) -> list[tuple[PydanticObjectId, str]]:
        """(id, signed URL) for the owner's own READY assets, in the order given.

        Order is preserved because a user who reorders their photos expects it
        to stick; a plain `$in` returns Mongo's natural order instead.
        """
        if not media_ids:
            return []
        # One query for the batch rather than one per id.
        assets = await MediaAsset.find(
            {"_id": {"$in": media_ids}, "status": MediaStatus.READY.value}
        ).to_list()
        by_id = {
            asset.id: asset
            for asset in assets
            if self._may_sign(asset, owner_id, allow_private=True)
        }
        ordered = [mid for mid in media_ids if mid in by_id]
        urls = await self.storage.presign_get_many(
            [(by_id[mid].key, self._ttl_for(by_id[mid].kind)) for mid in ordered]
        )
        return list(zip(ordered, urls, strict=True))

    async def signed_for_owners(
        self, pairs: list[tuple[PydanticObjectId, PydanticObjectId]]
    ) -> dict[PydanticObjectId, str]:
        """Sign assets of several owners in one query and one presign batch.

        Each pair is (media_id, expected owner); an asset whose real owner
        differs is skipped, exactly as `_may_sign` does for a single owner.
        """
        if not pairs:
            return {}
        owners = dict(pairs)
        assets = await MediaAsset.find(
            {"_id": {"$in": list(owners)}, "status": MediaStatus.READY.value}
        ).to_list()
        allowed = [
            asset
            for asset in assets
            if self._may_sign(asset, owners[asset.oid], allow_private=True)
        ]
        urls = await self.storage.presign_get_many(
            [(asset.key, self._ttl_for(asset.kind)) for asset in allowed]
        )
        return {asset.oid: url for asset, url in zip(allowed, urls, strict=True)}

    async def urls_for(
        self, media_ids: list[PydanticObjectId], *, owner_id: PydanticObjectId
    ) -> list[str]:
        return [url for _, url in await self.signed_for(media_ids, owner_id=owner_id)]

    async def _owned_ready(
        self,
        media_id: PydanticObjectId,
        owner_id: PydanticObjectId,
        *,
        kind: MediaKind | None = None,
    ) -> MediaAsset:
        asset = await MediaAsset.get(media_id)
        if (
            asset is None
            or asset.owner_id != owner_id
            or asset.status is not MediaStatus.READY
            or (kind is not None and asset.kind is not kind)
        ):
            # One answer for "missing", "not yours" and "wrong kind", so the
            # response is not an oracle for other users' media ids.
            raise ValidationError(
                detail="That media cannot be used here.",
                errors={"mediaIds": ["invalid"]},
            )
        return asset

    async def assert_private_frames(
        self, media_ids: list[PydanticObjectId], *, owner_id: PydanticObjectId
    ) -> None:
        for media_id in media_ids:
            await self._owned_ready(media_id, owner_id, kind=MediaKind.PRIVATE)

    async def assert_chat_image(
        self, media_id: PydanticObjectId, *, owner_id: PydanticObjectId
    ) -> None:
        await self._owned_ready(media_id, owner_id, kind=MediaKind.CHAT)

    async def read_owned(
        self, media_id: PydanticObjectId, *, owner_id: PydanticObjectId
    ) -> bytes:
        asset = await self._owned_ready(media_id, owner_id)
        return await self.storage.read(asset.key)

    async def delete_assets(
        self, media_ids: list[PydanticObjectId], *, owner_id: PydanticObjectId
    ) -> None:
        """Remove objects and records; a failure on one must not skip the rest."""
        for media_id in media_ids:
            asset = await MediaAsset.get(media_id)
            if asset is None or asset.owner_id != owner_id:
                continue
            try:
                await self.storage.delete(asset.key)
            except Exception:
                log.exception("media.delete_failed", media_id=str(media_id))
            await asset.delete()
