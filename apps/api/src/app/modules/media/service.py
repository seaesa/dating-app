import uuid

from beanie import PydanticObjectId

from app.core.config import Settings
from app.core.errors import ForbiddenError, NotFoundError, ValidationError
from app.modules.media.models import MediaAsset, MediaKind, MediaStatus
from app.modules.media.schemas import UploadUrlResponse
from app.modules.media.storage import MediaStorage

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
        await asset.save()

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
        - Kind. A `private/` key must never be signed into a publicly visible
          field, even for its owner, because the avatar is rendered to
          anonymous viewers.
        """
        if asset.owner_id != owner_id:
            return False
        return not (asset.kind is MediaKind.PRIVATE and not allow_private)

    async def url_for(
        self,
        media_id: PydanticObjectId | None,
        *,
        owner_id: PydanticObjectId,
        scope_allows_private: bool,
    ) -> str | None:
        if media_id is None:
            return None
        asset = await MediaAsset.get(media_id)
        # A PENDING asset may not exist in storage at all, so it gets no URL.
        if asset is None or asset.status is not MediaStatus.READY:
            return None
        if not self._may_sign(asset, owner_id, allow_private=scope_allows_private):
            return None
        return await self.storage.presign_get(
            asset.key, expires_in=self._ttl_for(asset.kind)
        )

    async def urls_for(
        self, media_ids: list[PydanticObjectId], *, owner_id: PydanticObjectId
    ) -> list[str]:
        """Signed URLs for the owner's own READY assets, in the order given.

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
        return [
            await self.storage.presign_get(
                by_id[mid].key, expires_in=self._ttl_for(by_id[mid].kind)
            )
            for mid in media_ids
            if mid in by_id
        ]
