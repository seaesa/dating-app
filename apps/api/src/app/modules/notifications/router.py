from typing import Annotated

from fastapi import APIRouter, Path, status

from app.core.deps import CurrentUser
from app.modules.notifications.schemas import PushDeviceBody
from app.modules.notifications.service import PushDeviceService

router = APIRouter(prefix="/me/push-devices", tags=["notifications"])


@router.put(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="registerPushDevice",
)
async def register_push_device(body: PushDeviceBody, user: CurrentUser) -> None:
    await PushDeviceService().register(user, body)


@router.delete(
    "/{token}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="unregisterPushDevice",
)
async def unregister_push_device(
    token: Annotated[str, Path(alias="token")], user: CurrentUser
) -> None:
    await PushDeviceService().unregister(user, token)
