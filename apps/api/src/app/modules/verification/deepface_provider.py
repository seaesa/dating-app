import asyncio
import importlib
from typing import Any

from app.core.config import Settings
from app.core.logging import get_logger
from app.modules.users.schemas import VerificationStatus
from app.modules.verification.provider import FaceResult, Frame

log = get_logger(__name__)

MODEL = "ArcFace"
# Set from the spike (Task 1); change both here and in the spike notes together.
DETECTOR = "retinaface"
STRAIGHT = "look_straight"


def _reject(reason: str) -> FaceResult:
    return FaceResult(VerificationStatus.REJECTED, None, reason)


def _decode(data: bytes) -> Any | None:
    # Imported here: numpy and OpenCV come with the optional `face` extra,
    # installed only where the worker runs.
    np = importlib.import_module("numpy")
    cv2 = importlib.import_module("cv2")
    image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    return None if image is None else image


def _yaw_ratio(area: dict[str, Any]) -> float | None:
    """Nose offset from the eye midpoint, in eye-spans. 0 is facing the camera."""
    left, right, nose = area.get("left_eye"), area.get("right_eye"), area.get("nose")
    if not (left and right and nose):
        return None
    span = abs(left[0] - right[0])
    if span == 0:
        return None
    return float((nose[0] - (left[0] + right[0]) / 2) / span)


class DeepFaceProvider:
    # One inference at a time: TensorFlow on CPU saturates the machine, and a
    # burst of submissions would starve the API's own request handling.
    _gate = asyncio.Semaphore(1)

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def verify(self, reference: bytes, frames: list[Frame]) -> FaceResult:
        async with self._gate:
            return await asyncio.to_thread(self._verify_sync, reference, frames)

    def _pose_ok(self, action: str, yaw: float) -> bool:
        """Facing the camera, or turned far enough.

        Direction is checked across frames (the two turns must point opposite
        ways) rather than per frame, so whether a camera mirrors its image
        cannot flip the meaning of left and right.
        """
        if action == STRAIGHT:
            return abs(yaw) <= self.settings.verification_yaw_straight_max
        return abs(yaw) >= self.settings.verification_yaw_turn_min

    def _ratio(self, deepface: Any, first: Any, second: Any) -> float | None:
        try:
            result = deepface.verify(
                img1_path=first,
                img2_path=second,
                model_name=MODEL,
                detector_backend=DETECTOR,
                distance_metric="cosine",
            )
        except ValueError:
            return None
        return float(result["distance"]) / float(result["threshold"])

    def _verify_sync(self, reference: bytes, frames: list[Frame]) -> FaceResult:
        deepface = importlib.import_module("deepface.DeepFace")
        images = [_decode(frame.data) for frame in frames]
        if any(image is None for image in images):
            return _reject("unreadable_frame")

        turns: list[float] = []
        for frame, image in zip(frames, images, strict=True):
            try:
                faces = deepface.extract_faces(
                    img_path=image, detector_backend=DETECTOR, anti_spoofing=True
                )
            except ValueError:
                return _reject("no_face")
            if len(faces) != 1:
                return _reject("face_count")
            if not faces[0].get("is_real", False):
                return _reject("spoof")
            yaw = _yaw_ratio(faces[0]["facial_area"])
            if yaw is None:
                return _reject("no_landmarks")
            if not self._pose_ok(frame.action, yaw):
                return _reject("wrong_pose")
            if frame.action != STRAIGHT:
                turns.append(yaw)

        if len(turns) == 2 and turns[0] * turns[1] >= 0:
            return _reject("wrong_pose")

        straight = images[[frame.action for frame in frames].index(STRAIGHT)]
        ref_image = _decode(reference)
        if ref_image is None:
            return _reject("reference_no_face")

        ratio = self._ratio(deepface, ref_image, straight)
        if ratio is None:
            return _reject("reference_no_face")

        # The turned frames must be the same person as the straight one, or the
        # three shots could come from three different people.
        for frame, image in zip(frames, images, strict=True):
            if frame.action == STRAIGHT:
                continue
            same = self._ratio(deepface, straight, image)
            if same is None or same > 1.0:
                return _reject("inconsistent")

        score = round(ratio, 3)
        if ratio <= self.settings.verification_auto_ratio:
            return FaceResult(VerificationStatus.VERIFIED, score, "match")
        return FaceResult(VerificationStatus.REJECTED, score, "mismatch")
