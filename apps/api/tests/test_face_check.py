import asyncio

import pytest

from app.modules.media.face_check import JOB_QUEUE, Face, judge
from app.modules.media.face_worker import process_job
from app.modules.media.models import FaceCheck, MediaAsset, MediaKind, MediaStatus
from app.modules.media.service import MediaService
from tests.factories import make_user


class FakeStorage:
    async def head(self, key):
        return {"ContentLength": 3}

    async def read(self, key):
        return b"img"


class FakeDetector:
    def __init__(self, reason):
        self.reason = reason

    def check(self, data):
        return self.reason


def test_judge_wants_one_clear_face(settings):
    face = Face(width=200, height=250, score=0.95)
    assert judge([face], 1000, 1000, settings) is None
    assert judge([], 1000, 1000, settings) == "no_face"
    assert judge([Face(200, 250, 0.5)], 1000, 1000, settings) == "no_face"
    assert judge([Face(50, 50, 0.95)], 1000, 1000, settings) == "face_too_small"
    assert judge([face, Face(150, 200, 0.9)], 1000, 1000, settings) == "multiple_faces"
    # Someone small in the background does not make it a group photo.
    assert judge([face, Face(40, 50, 0.9)], 1000, 1000, settings) is None


async def pending_photo(user, face_check=None, reason=None):
    return await MediaAsset(
        owner_id=user.oid,
        kind=MediaKind.PRIVATE,
        key=f"private/{user.oid}/main.jpg",
        content_type="image/jpeg",
        size=3,
        status=MediaStatus.READY if face_check else MediaStatus.PENDING,
        face_check=face_check,
        face_check_reason=reason,
    ).insert()


@pytest.mark.asyncio
async def test_confirm_waits_for_the_workers_verdict(redis, settings):
    enabled = settings.model_copy(update={"face_check_enabled": True})
    user = await make_user("+84910000001", photos=0)
    asset = await pending_photo(user)

    async def worker():
        while True:
            item = await redis.brpop([JOB_QUEUE], timeout=1)
            if item:
                return await process_job(item[1], FakeDetector("no_face"), FakeStorage())

    job = asyncio.create_task(worker())
    await MediaService(enabled, storage=FakeStorage()).confirm(asset.oid, user.oid)

    # Recorded by the time confirm answers, not some time later.
    saved = await MediaAsset.get(asset.oid)
    assert saved.face_check is FaceCheck.FAILED
    assert saved.face_check_reason == "no_face"
    assert await job is FaceCheck.FAILED


@pytest.mark.asyncio
async def test_confirm_without_a_worker_answers_after_the_wait(redis, settings):
    enabled = settings.model_copy(
        update={"face_check_enabled": True, "face_check_wait_seconds": 0.1}
    )
    user = await make_user("+84910000001", photos=0)
    asset = await pending_photo(user)
    await MediaService(enabled, storage=FakeStorage()).confirm(asset.oid, user.oid)
    assert (await MediaAsset.get(asset.oid)).face_check is FaceCheck.PENDING


@pytest.mark.asyncio
async def test_no_face_cannot_become_the_main_photo(api, bearer):
    user = await make_user("+84910000001")
    cat = await pending_photo(user, FaceCheck.FAILED, "no_face")
    photos = [str(cat.oid), *map(str, user.private.photo_media_ids)]

    as_main = await api.patch(
        "/v1/users/me/identity", json={"photoMediaIds": photos}, headers=bearer(user)
    )
    assert as_main.status_code == 422
    assert as_main.json()["errors"] == {"photoMediaIds": ["no_face"]}

    # Anywhere but first, it is just another photo.
    later = await api.patch(
        "/v1/users/me/identity",
        json={"photoMediaIds": [*photos[1:], photos[0]]},
        headers=bearer(user),
    )
    assert later.status_code == 200


@pytest.mark.asyncio
async def test_sign_up_waits_for_a_pending_main_photo(api, bearer):
    user = await make_user("+84910000001")
    waiting = await pending_photo(user, FaceCheck.PENDING)
    photos = [str(waiting.oid), *map(str, user.private.photo_media_ids)]
    saved = await api.patch(
        "/v1/users/me/identity", json={"photoMediaIds": photos}, headers=bearer(user)
    )
    assert saved.status_code == 200

    done = await api.post("/v1/users/me/onboarding/complete", headers=bearer(user))
    assert done.status_code == 422
    assert done.json()["errors"] == {"photoMediaIds": ["face_check_pending"]}
