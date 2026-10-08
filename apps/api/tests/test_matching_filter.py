from datetime import UTC, datetime

import pytest

from app.modules.interactions.models import UserInteraction
from app.modules.interactions.schemas import InteractionAction
from app.modules.matching.service import MatchingService
from app.modules.users.criteria import MatchCriteria
from app.modules.users.models import User
from app.modules.users.schemas import GeoPoint, MatchingProfile, PublicProfile, UserStatus


@pytest.mark.asyncio
async def test_mutual_hard_filters_case_study():
    current_year = datetime.now(UTC).year

    # Hồ sơ A: Nam, 26t, tìm Nữ 22-28t, max distance 10km
    user_a = User(
        phone="+84900000010",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="User A",
            gender="male",
            birth_year=current_year - 26,
            city="Hà Nội",
        ),
        matching=MatchingProfile(
            criteria=MatchCriteria(
                genders=["female"],
                age_min=22,
                age_max=28,
                max_distance_km=10,
            )
        ),
    )
    user_a.private.location = GeoPoint(coordinates=[105.8542, 21.0285])  # Hoàn Kiếm
    await user_a.insert()

    # Hồ sơ B: Nữ, 24t, tìm Nam 24-30t, max distance 15km, cách A ~3.7km
    user_b = User(
        phone="+84900000011",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="User B",
            gender="female",
            birth_year=current_year - 24,
            city="Hà Nội",
        ),
        matching=MatchingProfile(
            criteria=MatchCriteria(
                genders=["male"],
                age_min=24,
                age_max=30,
                max_distance_km=15,
            )
        ),
    )
    user_b.private.location = GeoPoint(
        coordinates=[105.8194, 21.0333]
    )  # Ba Đình (~3.7km)
    await user_b.insert()

    # Hồ sơ C: Nữ, 24t, nhưng cách A > 25km (Hà Đông / Ba Vì)
    user_c = User(
        phone="+84900000012",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="User C (Far)",
            gender="female",
            birth_year=current_year - 24,
            city="Hà Nội",
        ),
        matching=MatchingProfile(
            criteria=MatchCriteria(
                genders=["male"],
                age_min=24,
                age_max=30,
                max_distance_km=30,
            )
        ),
    )
    user_c.private.location = GeoPoint(coordinates=[105.5200, 21.0800])  # > 30km
    await user_c.insert()

    # Hồ sơ D: Nữ, 35t (vượt quá khoảng tuổi 22-28 mà A tìm)
    user_d = User(
        phone="+84900000013",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="User D (Older)",
            gender="female",
            birth_year=current_year - 35,
            city="Hà Nội",
        ),
        matching=MatchingProfile(
            criteria=MatchCriteria(
                genders=["male"],
                age_min=24,
                age_max=40,
                max_distance_km=15,
            )
        ),
    )
    user_d.private.location = GeoPoint(coordinates=[105.8194, 21.0333])
    await user_d.insert()

    # Kiểm tra service tìm ứng viên cho User A
    service = MatchingService()
    candidates = await service.get_eligible_candidates(user_a)

    candidate_ids = [c.user.oid for c in candidates]
    assert user_b.oid in candidate_ids, "User B phải vượt qua bộ lọc cứng!"
    assert user_c.oid not in candidate_ids, "User C phải bị loại do khoảng cách > 10km!"
    assert user_d.oid not in candidate_ids, "User D phải bị loại do độ tuổi ngoài khoảng!"

    # Kiểm tra khoảng cách tính toán cho User B
    cand_b = next(c for c in candidates if c.user.oid == user_b.oid)
    assert cand_b.distance_km is not None
    assert 3.0 <= cand_b.distance_km <= 4.5, (
        f"Khoảng cách phải ~3.7km, thực tế: {cand_b.distance_km}"
    )

    # Kiểm tra tính 2 chiều từ phía User B
    candidates_for_b = await service.get_eligible_candidates(user_b)
    cand_b_ids = [c.user.oid for c in candidates_for_b]
    assert user_a.oid in cand_b_ids, "User A phải hợp lệ đối với tiêu chí của User B!"

    # Kiểm tra loại trừ sau khi A đã Chào User B
    greet_interaction = await UserInteraction(
        actor_id=user_a.oid,
        target_id=user_b.oid,
        action=InteractionAction.GREET,
    ).insert()

    candidates_after_greet = await service.get_eligible_candidates(user_a)
    after_ids = [c.user.oid for c in candidates_after_greet]
    assert user_b.oid not in after_ids, (
        "User B đã chào thì không được xuất hiện lại trong feed!"
    )

    # Xóa interaction greet để kiểm tra trường hợp B Block A
    await greet_interaction.delete()

    await UserInteraction(
        actor_id=user_b.oid,
        target_id=user_a.oid,
        action=InteractionAction.BLOCK,
    ).insert()

    candidates_after_block = await service.get_eligible_candidates(user_a)
    assert user_b.oid not in [c.user.oid for c in candidates_after_block], (
        "B đã block A thì A không thể thấy B!"
    )


@pytest.mark.asyncio
async def test_city_fallback_without_gps():
    current_year = datetime.now(UTC).year

    # User X không có GPS tọa độ, ở TP.HCM
    user_x = User(
        phone="+84900000020",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="User X",
            gender="male",
            birth_year=current_year - 25,
            city="TP.HCM",
        ),
        matching=MatchingProfile(
            criteria=MatchCriteria(
                genders=["female"],
                age_min=20,
                age_max=30,
            )
        ),
    )
    await user_x.insert()

    # User Y ở TP.HCM, không có GPS
    user_y = User(
        phone="+84900000021",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="User Y",
            gender="female",
            birth_year=current_year - 23,
            city="TP.HCM",
        ),
    )
    await user_y.insert()

    # User Z ở Đà Nẵng
    user_z = User(
        phone="+84900000022",
        status=UserStatus.ACTIVE,
        public=PublicProfile(
            display_name="User Z",
            gender="female",
            birth_year=current_year - 23,
            city="Đà Nẵng",
        ),
    )
    await user_z.insert()

    service = MatchingService()
    candidates = await service.get_eligible_candidates(user_x)
    cand_ids = [c.user.oid for c in candidates]

    assert user_y.oid in cand_ids, (
        "User Y cùng TP.HCM phải được match fallback theo thành phố!"
    )
    assert user_z.oid not in cand_ids, "User Z ở Đà Nẵng khác thành phố phải bị loại!"
