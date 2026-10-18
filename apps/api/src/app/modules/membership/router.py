from fastapi import APIRouter, Response

from app.modules.membership.models import MembershipPlan
from app.modules.membership.schemas import MembershipConfigRead, MembershipPlanRead
from app.modules.system_config.models import SystemConfig

router = APIRouter(prefix="/membership", tags=["membership"])


@router.get(
    "/config",
    response_model=MembershipConfigRead,
    operation_id="getMembershipConfig",
)
async def get_membership_config(response: Response) -> MembershipConfigRead:
    """Fetch global membership settings (free mode status) and active plans."""
    response.headers["Cache-Control"] = "public, max-age=60"
    sys_config = await SystemConfig.find_one()
    free_mode_enabled = sys_config.free_mode_enabled if sys_config else True

    plans_doc = (
        await MembershipPlan.find({"is_active": True}).sort("sort_order").to_list()
    )
    plans = [
        MembershipPlanRead(
            code=p.code,
            name=p.name,
            description=p.description,
            price=p.price,
            original_price=p.original_price,
            duration_days=p.duration_days,
            features=p.features,
            is_active=p.is_active,
            is_popular=p.is_popular,
            sort_order=p.sort_order,
        )
        for p in plans_doc
    ]
    return MembershipConfigRead(
        free_mode_enabled=free_mode_enabled,
        plans=plans,
    )
