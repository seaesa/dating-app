from fastapi import APIRouter, Response

from app.modules.catalog.schemas import ProfileOptionsRead
from app.modules.catalog.service import profile_options

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get(
    "/profile-options",
    response_model=ProfileOptionsRead,
    operation_id="getProfileOptions",
)
async def get_profile_options(response: Response) -> ProfileOptionsRead:
    # Static between deploys, so let clients and CDNs keep it for an hour.
    response.headers["Cache-Control"] = "public, max-age=3600"
    return profile_options()
