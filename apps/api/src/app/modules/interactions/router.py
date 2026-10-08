from fastapi import APIRouter, status

from app.core.deps import CurrentUser
from app.modules.interactions.schemas import (
    InteractionCreate,
    InteractionResultRead,
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
