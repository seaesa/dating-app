import importlib
import pathlib
from dataclasses import dataclass
from typing import Any

from app.core.config import Settings

# Confirming a profile photo pushes its id here; `app.cli face-check-worker`
# answers on the result key, which the confirm request waits on.
JOB_QUEUE = "media:face-jobs"
RESULT_KEY = "media:face-result:{media_id}"
RESULT_TTL_SECONDS = 60

# YuNet from opencv_zoo (MIT): 227 KB, a few ms per photo on one CPU core.
MODEL = pathlib.Path(__file__).with_name("face_detection_yunet_2023mar.onnx")
# Detection runs on a downscaled copy: faces that matter are large, and the
# cost grows with the pixel count.
MAX_SIDE = 640


@dataclass(frozen=True)
class Face:
    width: float
    height: float
    score: float


def judge(faces: list[Face], width: int, height: int, settings: Settings) -> str | None:
    """Why this photo cannot be a main photo, or None when it can.

    A main photo shows its owner: one clear face, large enough to recognise.
    """
    faces = sorted(
        (f for f in faces if f.score >= settings.face_check_min_score),
        key=lambda f: f.width * f.height,
        reverse=True,
    )
    if not faces:
        return "no_face"
    largest = faces[0].width * faces[0].height
    if largest / (width * height) < settings.face_check_min_area:
        return "face_too_small"
    if len(faces) > 1:
        second = faces[1].width * faces[1].height
        if second >= settings.face_check_second_face_ratio * largest:
            return "multiple_faces"
    return None


class FaceDetector:
    """OpenCV's YuNet. Not thread-safe: use one instance from one task at a time."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        # Imported here: OpenCV comes with the optional `vision` extra,
        # installed only where the worker runs.
        self._cv2: Any = importlib.import_module("cv2")
        self._np: Any = importlib.import_module("numpy")
        self._model = self._cv2.FaceDetectorYN.create(
            str(MODEL), "", (MAX_SIDE, MAX_SIDE), settings.face_check_min_score
        )

    def check(self, data: bytes) -> str | None:
        """Blocking; run it in a thread. The reason it fails, or None."""
        cv2 = self._cv2
        # imdecode applies the EXIF orientation, so a sideways phone photo is
        # read upright.
        image = cv2.imdecode(self._np.frombuffer(data, dtype=self._np.uint8), 1)
        if image is None:
            return "unreadable"
        height, width = image.shape[:2]
        scale = min(1.0, MAX_SIDE / max(width, height))
        if scale < 1.0:
            width, height = round(width * scale), round(height * scale)
            image = cv2.resize(image, (width, height), interpolation=cv2.INTER_AREA)
        self._model.setInputSize((width, height))
        _, found = self._model.detect(image)
        # Each row: x, y, w, h, five landmarks (x, y), score.
        faces = [
            Face(float(r[2]), float(r[3]), float(r[14]))
            for r in ([] if found is None else found)
        ]
        return judge(faces, width, height, self.settings)
