from datetime import UTC, datetime

from beanie import PydanticObjectId

from app.core.errors import BadRequestError, NotFoundError
from app.modules.interactions.models import UserInteraction
from app.modules.interactions.schemas import (
    InteractionAction,
    InteractionCreate,
    InteractionResultRead,
)
from app.modules.users.models import User
from app.modules.users.schemas import UserStatus

POSITIVE_ACTIONS = frozenset(
    {InteractionAction.GREET, InteractionAction.LIKE, InteractionAction.STAR}
)


class InteractionService:
    """Handles user interactions, blocks, reports, and mutual matches."""

    async def record_interaction(
        self, actor: User, body: InteractionCreate
    ) -> InteractionResultRead:
        target_oid = PydanticObjectId(body.target_id)

        # Disallow self-interaction
        if target_oid == actor.oid:
            raise BadRequestError(detail="Cannot interact with yourself.")

        # Ensure target user exists and is active
        target_user = await User.get(target_oid)
        if target_user is None or target_user.status is not UserStatus.ACTIVE:
            raise NotFoundError(detail="User not found.")

        # Upsert interaction
        existing = await UserInteraction.find_one(
            {"actor_id": actor.oid, "target_id": target_oid}
        )
        if existing is None:
            interaction = UserInteraction(
                actor_id=actor.oid,
                target_id=target_oid,
                action=body.action,
            )
            await interaction.insert()
        else:
            existing.action = body.action
            existing.created_at = datetime.now(UTC)
            await existing.save()

        # Check mutual match for positive actions
        matched = False
        if body.action in POSITIVE_ACTIONS:
            target_mutual = await UserInteraction.find_one(
                {
                    "actor_id": target_oid,
                    "target_id": actor.oid,
                    "action": {"$in": list(POSITIVE_ACTIONS)},
                }
            )
            matched = target_mutual is not None

        return InteractionResultRead(
            action=body.action,
            target_id=target_oid,
            matched=matched,
        )
