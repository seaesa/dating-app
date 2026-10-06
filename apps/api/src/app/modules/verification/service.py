import json
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from beanie import PydanticObjectId

from app.core.config import Settings
from app.core.errors import (
    ConflictError,
    ForbiddenError,
    RateLimitedError,
    ValidationError,
)
from app.core.logging import get_logger
from app.core.ratelimit import sliding_window
from app.core.redis import get_redis
from app.modules.media.service import MediaService
from app.modules.users.models import User
from app.modules.users.schemas import VerificationRead, VerificationStatus
from app.modules.verification.exceptions import VerificationDisabledError
from app.modules.verification.provider import (
    FaceVerificationProvider,
    Frame,
    build_provider,
)
from app.modules.verification.schemas import Action, ChallengeRead, SubmitBody

log = get_logger(__name__)

CONSENT_VERSION = "2026-10-v1"
CHALLENGE_KEY = "verify:challenge:{challenge_id}"
# Submissions wait here for the verification worker (`app.cli verification-worker`).
JOB_QUEUE = "verify:jobs"
ACTIONS: tuple[Action, ...] = ("turn_left", "turn_right", "look_straight")
_RNG = secrets.SystemRandom()


class VerificationService:
    def __init__(
        self,
        settings: Settings,
        provider: FaceVerificationProvider | None = None,
        media: MediaService | None = None,
    ) -> None:
        self.settings = settings
        self._provider = provider
        self.media = media or MediaService(settings)

    @property
    def provider(self) -> FaceVerificationProvider:
        # Built on first use: only the worker runs a provider, and the API
        # process has no TensorFlow installed.
        if self._provider is None:
            self._provider = build_provider(self.settings)
        return self._provider

    def _require_enabled(self) -> None:
        if not self.settings.verification_enabled:
            raise VerificationDisabledError(detail="Face verification is switched off.")

    @staticmethod
    def _today() -> str:
        return datetime.now(UTC).date().isoformat()

    def _read(self, user: User) -> VerificationRead:
        state = user.private.verification
        return VerificationRead(
            status=state.status,
            attempts_left=state.attempts_left(
                self.settings.verification_max_attempts_per_day, self._today()
            ),
            consented=state.consent_at is not None,
            failure_reason=state.failure_reason,
            available=self.settings.verification_enabled,
        )

    def _in_flight(self, user: User) -> bool:
        """Pending or settled; a submission lost with its worker is not in flight."""
        state = user.private.verification
        if state.status is VerificationStatus.VERIFIED:
            return True
        if state.status is VerificationStatus.PENDING:
            started = state.submitted_at or datetime.now(UTC)
            timeout = timedelta(seconds=self.settings.verification_pending_timeout)
            return datetime.now(UTC) - started < timeout
        return False

    async def consent(self, user: User) -> VerificationRead:
        self._require_enabled()
        state = user.private.verification
        state.consent_at = datetime.now(UTC)
        state.consent_version = CONSENT_VERSION
        await user.save()
        return self._read(user)

    async def create_challenge(self, user: User) -> ChallengeRead:
        self._require_enabled()
        state = user.private.verification
        if state.consent_at is None:
            raise ForbiddenError(detail="Biometric consent is required.")
        if self._in_flight(user):
            raise ConflictError(detail="Verification is already in progress or complete.")
        if not user.private.photo_media_ids:
            raise ValidationError(
                detail="Add a profile photo before verifying.",
                errors={"photo": ["missing"]},
            )
        if self._read(user).attempts_left == 0:
            raise RateLimitedError(detail="No attempts left today.", retry_after=86400)
        await sliding_window(f"rl:verify:challenge:{user.oid}", limit=10, window=3600)

        challenge_id = secrets.token_urlsafe(16)
        actions = _RNG.sample(ACTIONS, k=len(ACTIONS))
        await get_redis().set(
            CHALLENGE_KEY.format(challenge_id=challenge_id),
            json.dumps({"userId": str(user.oid), "actions": actions}),
            ex=self.settings.verification_challenge_ttl,
        )
        return ChallengeRead(
            challenge_id=challenge_id,
            actions=actions,
            expires_in=self.settings.verification_challenge_ttl,
        )

    async def submit(self, user: User, body: SubmitBody) -> VerificationRead:
        self._require_enabled()
        # GETDEL: a challenge is consumed by the first attempt, right or wrong.
        raw = await get_redis().getdel(
            CHALLENGE_KEY.format(challenge_id=body.challenge_id)
        )
        if raw is None:
            raise ValidationError(
                detail="The challenge expired. Start again.",
                errors={"challengeId": ["expired"]},
            )
        data = json.loads(raw)
        if data["userId"] != str(user.oid):
            raise ForbiddenError(detail="That challenge belongs to another account.")
        if self._in_flight(user):
            raise ConflictError(detail="Verification is already in progress or complete.")
        if self._read(user).attempts_left == 0:
            raise RateLimitedError(detail="No attempts left today.", retry_after=86400)

        media_ids = list(body.media_ids)
        if len(set(media_ids)) != len(media_ids):
            raise ValidationError(
                detail="Each frame must be a different upload.",
                errors={"mediaIds": ["duplicate"]},
            )
        await self.media.assert_private_frames(media_ids, owner_id=user.oid)

        state = user.private.verification
        today = self._today()
        state.attempts_today = (
            state.attempts_today if state.attempts_day == today else 0
        ) + 1
        state.attempts_day = today
        state.status = VerificationStatus.PENDING
        state.submitted_at = datetime.now(UTC)
        state.score = None
        state.failure_reason = None
        await user.save()

        # The worker scores it; the API never loads the model.
        job = {
            "userId": str(user.oid),
            "actions": data["actions"],
            "mediaIds": [str(media_id) for media_id in media_ids],
        }
        await get_redis().lpush(JOB_QUEUE, json.dumps(job))
        return self._read(user)

    async def process_job(self, raw: str | bytes) -> None:
        """Score one queued submission; called by the worker."""
        job = json.loads(raw)
        await self._process(
            PydanticObjectId(job["userId"]),
            job["actions"],
            [PydanticObjectId(media_id) for media_id in job["mediaIds"]],
        )

    async def _process(
        self,
        user_id: PydanticObjectId,
        actions: list[str],
        media_ids: list[PydanticObjectId],
    ) -> None:
        """Score a submission. The frames are always deleted, whatever happens.

        The result is written with a targeted update rather than `user.save()`:
        inference takes seconds, and saving the document loaded before it would
        overwrite any profile edit made meanwhile. The update only matches while
        the reference photo is unchanged, so a verdict on an old photo is dropped.
        """
        try:
            user = await User.get(user_id)
            if user is None or not user.private.photo_media_ids:
                return
            reference_id = user.private.photo_media_ids[0]
            fields: dict[str, Any]
            inc: dict[str, int] = {}
            try:
                reference = await self.media.read_owned(reference_id, owner_id=user_id)
                frames = [
                    Frame(action, await self.media.read_owned(media_id, owner_id=user_id))
                    for action, media_id in zip(actions, media_ids, strict=True)
                ]
                result = await self.provider.verify(reference, frames)
                verified = result.status is VerificationStatus.VERIFIED
                fields = {
                    "status": result.status.value,
                    "score": result.score,
                    "failure_reason": None if verified else result.reason,
                    "verified_at": datetime.now(UTC) if verified else None,
                }
                log.info(
                    "verification.done",
                    user=str(user_id),
                    status=result.status.value,
                    reason=result.reason,
                )
            except Exception:
                # Our failure, not a verdict on the person: put them back where
                # they were and give the attempt back.
                log.exception("verification.failed", user=str(user_id))
                fields = {
                    "status": VerificationStatus.UNVERIFIED.value,
                    "score": None,
                    "failure_reason": "error",
                }
                inc = {"private.verification.attempts_today": -1}

            update: dict[str, Any] = {
                "$set": {f"private.verification.{k}": v for k, v in fields.items()}
            }
            if inc:
                update["$inc"] = inc
            await User.find_one(
                {"_id": user_id, "private.photo_media_ids.0": reference_id}
            ).update(update)
        finally:
            await self.media.delete_assets(media_ids, owner_id=user_id)
