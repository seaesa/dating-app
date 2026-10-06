from dataclasses import dataclass
from typing import Protocol

from app.core.config import Settings
from app.modules.users.schemas import VerificationStatus


@dataclass(frozen=True)
class Frame:
    action: str
    data: bytes


@dataclass(frozen=True)
class FaceResult:
    status: VerificationStatus
    score: float | None
    reason: str


class FaceVerificationProvider(Protocol):
    async def verify(self, reference: bytes, frames: list[Frame]) -> FaceResult: ...


def build_provider(settings: Settings) -> FaceVerificationProvider:
    # Imported here so TensorFlow loads on the first verification, not at boot.
    from app.modules.verification.deepface_provider import DeepFaceProvider

    return DeepFaceProvider(settings)
