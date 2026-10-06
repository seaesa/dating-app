from fastapi import APIRouter

from app.core.deps import CurrentUser, SettingsDep
from app.modules.users.schemas import VerificationRead
from app.modules.verification.schemas import ChallengeRead, SubmitBody
from app.modules.verification.service import VerificationService

router = APIRouter(prefix="/verification", tags=["verification"])


@router.post(
    "/consent", response_model=VerificationRead, operation_id="recordVerificationConsent"
)
async def record_consent(user: CurrentUser, settings: SettingsDep) -> VerificationRead:
    return await VerificationService(settings).consent(user)


@router.post(
    "/challenge", response_model=ChallengeRead, operation_id="createVerificationChallenge"
)
async def create_challenge(user: CurrentUser, settings: SettingsDep) -> ChallengeRead:
    return await VerificationService(settings).create_challenge(user)


@router.post(
    "/submit", response_model=VerificationRead, operation_id="submitVerification"
)
async def submit(
    user: CurrentUser,
    body: SubmitBody,
    settings: SettingsDep,
) -> VerificationRead:
    return await VerificationService(settings).submit(user, body)
