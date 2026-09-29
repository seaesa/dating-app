from typing import Annotated

from beanie import PydanticObjectId
from fastapi import APIRouter, Path, status

from app.core.deps import CurrentUser, SettingsDep
from app.core.schemas import Message
from app.modules.media.schemas import UploadUrlBody, UploadUrlResponse
from app.modules.media.service import MediaService

router = APIRouter(prefix="/media", tags=["media"])


@router.post(
    "/upload-url",
    response_model=UploadUrlResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="createUploadUrl",
)
async def create_upload_url(
    body: UploadUrlBody, user: CurrentUser, settings: SettingsDep
) -> UploadUrlResponse:
    return await MediaService(settings).create_upload_url(
        user.oid, body.kind, body.content_type, body.size
    )


@router.post("/{mediaId}/confirm", response_model=Message, operation_id="confirmUpload")
async def confirm_upload(
    media_id: Annotated[PydanticObjectId, Path(alias="mediaId")],
    user: CurrentUser,
    settings: SettingsDep,
) -> Message:
    await MediaService(settings).confirm(media_id, user.oid)
    return Message(message="Upload confirmed.")
