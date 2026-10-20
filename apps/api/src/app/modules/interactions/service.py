import math
from datetime import UTC, datetime

from beanie import PydanticObjectId

from app.core.errors import BadRequestError, NotFoundError
from app.modules.interactions.models import UserInteraction
from app.modules.interactions.schemas import (
    BlockedUserRead,
    InteractionAction,
    InteractionCreate,
    InteractionResultRead,
    ReceivedInteractionRead,
)
from app.modules.users.models import User
from app.modules.users.schemas import UserStatus
from app.modules.users.visibility import RevealScope, project_user

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

        if body.action is InteractionAction.BLOCK:
            # A block must end any open chat too, wherever it is issued from.
            # Imported here: connections.service imports interactions.models.
            from app.modules.connections.models import CloseReason
            from app.modules.connections.service import ConnectionService

            await ConnectionService().close_between(
                actor.oid, target_oid, CloseReason.BLOCK
            )

        # Check mutual match for positive actions
        matched = False
        connection_id = None
        if body.action in POSITIVE_ACTIONS:
            target_mutual = await UserInteraction.find_one(
                {
                    "actor_id": target_oid,
                    "target_id": actor.oid,
                    "action": {"$in": list(POSITIVE_ACTIONS)},
                }
            )
            matched = target_mutual is not None
            if matched:
                from app.modules.connections.service import ConnectionService

                conn_service = ConnectionService()
                existing_conn = await conn_service.repository.find_between(
                    actor.oid, target_oid
                )
                if existing_conn:
                    connection_id = existing_conn.oid
                else:
                    try:
                        req = await conn_service.request(actor, target_oid)
                        accepted = await conn_service.accept(target_user, req.oid)
                        connection_id = accepted.oid
                    except Exception:
                        found = await conn_service.repository.find_between(
                            actor.oid, target_oid
                        )
                        if found:
                            connection_id = found.oid

        return InteractionResultRead(
            action=body.action,
            target_id=target_oid,
            matched=matched,
            connection_id=connection_id,
        )

    async def get_received_interactions(
        self, user: User, limit: int = 50
    ) -> list[ReceivedInteractionRead]:
        """Fetch incoming positive interactions that user has not reacted to yet."""
        # 1. User's outgoing interactions (exclude users already greeted/passed/blocked)
        outgoing = await UserInteraction.find({"actor_id": user.oid}).to_list()
        already_handled_ids = {doc.target_id for doc in outgoing}
        already_handled_ids.add(user.oid)

        # 2. Incoming positive interactions
        inbound = (
            await UserInteraction.find(
                {
                    "target_id": user.oid,
                    "actor_id": {"$nin": list(already_handled_ids)},
                    "action": {"$in": list(POSITIVE_ACTIONS)},
                }
            )
            .sort("-created_at")
            .limit(limit)
            .to_list()
        )

        if not inbound:
            return []

        # 3. Fetch actor users
        actor_ids = [doc.actor_id for doc in inbound]
        actor_users = await User.find(
            {"_id": {"$in": actor_ids}, "status": UserStatus.ACTIVE}
        ).to_list()
        actor_map = {u.oid: u for u in actor_users}

        results: list[ReceivedInteractionRead] = []
        user_coords = (
            user.private.location.coordinates
            if user.private.location and len(user.private.location.coordinates) == 2
            else None
        )

        for doc in inbound:
            actor = actor_map.get(doc.actor_id)
            if not actor:
                continue

            dist_km = None
            actor_loc = actor.private.location
            if user_coords and actor_loc and len(actor_loc.coordinates) == 2:
                lon1, lat1 = user_coords
                lon2, lat2 = actor_loc.coordinates
                dlat = math.radians(lat2 - lat1)
                dlon = math.radians(lon2 - lon1)
                a = (
                    math.sin(dlat / 2) ** 2
                    + math.cos(math.radians(lat1))
                    * math.cos(math.radians(lat2))
                    * math.sin(dlon / 2) ** 2
                )
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                dist_km = round(6371.0 * c, 1)

            if doc.id is None:
                continue

            projected_actor = project_user(actor, RevealScope.PUBLIC)
            results.append(
                ReceivedInteractionRead(
                    interaction_id=doc.id,
                    actor=projected_actor,
                    action=doc.action,
                    created_at=doc.created_at,
                    distance_km=dist_km,
                )
            )

        return results

    async def get_blocked_users(
        self, user: User, limit: int = 100
    ) -> list[BlockedUserRead]:
        """Fetch users currently blocked by the current user."""
        blocked_docs = (
            await UserInteraction.find(
                {
                    "actor_id": user.oid,
                    "action": InteractionAction.BLOCK,
                }
            )
            .sort("-created_at")
            .limit(limit)
            .to_list()
        )
        if not blocked_docs:
            return []

        target_ids = [doc.target_id for doc in blocked_docs]
        target_users = await User.find({"_id": {"$in": target_ids}}).to_list()
        target_map = {u.oid: u for u in target_users}

        results: list[BlockedUserRead] = []
        for doc in blocked_docs:
            target = target_map.get(doc.target_id)
            if not target or doc.id is None:
                continue
            projected = project_user(target, RevealScope.PUBLIC)
            results.append(
                BlockedUserRead(
                    interaction_id=doc.id,
                    target_id=doc.target_id,
                    target=projected,
                    blocked_at=doc.created_at,
                )
            )
        return results

    async def unblock_user(self, user: User, target_id: PydanticObjectId) -> None:
        """Remove a block interaction between current user and target user."""
        interaction = await UserInteraction.find_one(
            {
                "actor_id": user.oid,
                "target_id": target_id,
                "action": InteractionAction.BLOCK,
            }
        )
        if interaction is not None:
            await interaction.delete()
