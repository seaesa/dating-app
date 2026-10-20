from typing import Annotated

from beanie import PydanticObjectId
from fastapi import APIRouter, Path, Query, status

from app.core.deps import CurrentUser
from app.modules.interactions.schemas import (
    BlockedUserRead,
    InteractionCreate,
    InteractionResultRead,
    ReceivedInteractionRead,
)
from app.modules.interactions.service import InteractionService

router = APIRouter(prefix="/interactions", tags=["interactions"])


@router.post(
    "",
    response_model=InteractionResultRead,
    status_code=status.HTTP_200_OK,
    operation_id="createInteraction",
)
async def create_interaction(
    body: InteractionCreate,
    user: CurrentUser,
) -> InteractionResultRead:
    """Record an interaction (greet, like, pass, star, block, report)."""
    return await InteractionService().record_interaction(user, body)


@router.get(
    "/received",
    response_model=list[ReceivedInteractionRead],
    status_code=status.HTTP_200_OK,
    operation_id="getReceivedInteractions",
)
async def get_received_interactions(
    user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=50)] = 50,
) -> list[ReceivedInteractionRead]:
    """Fetch inbound likes/greets received by current user."""
    return await InteractionService().get_received_interactions(user, limit=limit)


@router.get(
    "/blocked",
    response_model=list[BlockedUserRead],
    status_code=status.HTTP_200_OK,
    operation_id="getBlockedUsers",
)
async def get_blocked_users(
    user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[BlockedUserRead]:
    """Fetch users blocked by current user."""
    return await InteractionService().get_blocked_users(user, limit=limit)


@router.delete(
    "/blocked/{target_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="unblockUser",
)
async def unblock_user(
    target_id: Annotated[PydanticObjectId, Path(alias="target_id")],
    user: CurrentUser,
) -> None:
    """Unblock a user."""
    await InteractionService().unblock_user(user, target_id)
