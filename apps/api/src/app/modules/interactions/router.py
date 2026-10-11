from typing import Annotated

from fastapi import APIRouter, Query, status

from app.core.deps import CurrentUser
from app.modules.interactions.schemas import (
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
