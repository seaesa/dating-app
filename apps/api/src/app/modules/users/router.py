from typing import Annotated

from beanie import PydanticObjectId
from fastapi import APIRouter, Path

from app.core.deps import CurrentUser, OptionalUser, SettingsDep
from app.modules.users.criteria import MatchCriteria
from app.modules.users.schemas import (
    PrivateIdentityUpdate,
    PublicProfileUpdate,
    SensitiveAttributes,
    UserRead,
)
from app.modules.users.service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead, operation_id="getMe")
async def get_me(user: CurrentUser, settings: SettingsDep) -> UserRead:
    return await UserService(settings=settings).get_me(user)


@router.patch("/me/profile", response_model=UserRead, operation_id="updateMyProfile")
async def update_my_profile(
    user: CurrentUser, patch: PublicProfileUpdate, settings: SettingsDep
) -> UserRead:
    return await UserService(settings=settings).update_profile(user, patch)


@router.patch("/me/identity", response_model=UserRead, operation_id="updateMyIdentity")
async def update_my_identity(
    user: CurrentUser, patch: PrivateIdentityUpdate, settings: SettingsDep
) -> UserRead:
    return await UserService(settings=settings).update_identity(user, patch)


@router.put("/me/criteria", response_model=UserRead, operation_id="updateMyCriteria")
async def update_my_criteria(
    user: CurrentUser, body: MatchCriteria, settings: SettingsDep
) -> UserRead:
    return await UserService(settings=settings).update_criteria(user, body)


@router.patch("/me/sensitive", response_model=UserRead, operation_id="updateMySensitive")
async def update_my_sensitive(
    user: CurrentUser, body: SensitiveAttributes, settings: SettingsDep
) -> UserRead:
    return await UserService(settings=settings).update_sensitive(user, body)


@router.post(
    "/me/onboarding/complete",
    response_model=UserRead,
    operation_id="completeMyOnboarding",
)
async def complete_my_onboarding(user: CurrentUser, settings: SettingsDep) -> UserRead:
    return await UserService(settings=settings).complete_onboarding(user)


@router.get("/{userId}", response_model=UserRead, operation_id="getUser")
async def get_user(
    # The path segment is camelCase so the generated client reads
    # `{ path: { userId } }`. Ruff wants the Python name snake_case, and
    # Path(alias=...) bridges the two — BaseSchema aliases body and response
    # fields but cannot reach a path parameter.
    user_id: Annotated[PydanticObjectId, Path(alias="userId")],
    viewer: OptionalUser,
    settings: SettingsDep,
) -> UserRead:
    return await UserService(settings=settings).get_for_viewer(user_id, viewer)
