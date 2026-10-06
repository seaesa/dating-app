"""Every value a profile attribute may take, in one place.

Keys are stable identifiers stored in the database; labels are the Vietnamese
copy the client renders. The client reads this through the catalog endpoint, so
a label or a new option ships from the server without an app release. Never
rename a value that users already store: add a new one instead.
"""

from typing import Final, NamedTuple

import emoji

Option = tuple[str, str]

MAX_INTERESTS: Final = 10
HEIGHT_MIN: Final = 140
HEIGHT_MAX: Final = 220


class AttributeSpec(NamedTuple):
    label: str
    group: str
    options: tuple[Option, ...]
    multi: bool = False


ATTRIBUTES: Final[dict[str, AttributeSpec]] = {
    "intent": AttributeSpec(
        "Bạn đang tìm kiếm",
        "Mục đích",
        (
            ("serious", "Mối quan hệ nghiêm túc"),
            ("casual", "Làm quen, hẹn hò thoải mái"),
            ("friends", "Kết bạn"),
            ("unsure", "Chưa chắc chắn"),
        ),
    ),
    "education": AttributeSpec(
        "Học vấn",
        "Cơ bản",
        (
            ("high_school", "Trung học"),
            ("college", "Cao đẳng"),
            ("bachelor", "Đại học"),
            ("master", "Thạc sĩ"),
            ("doctorate", "Tiến sĩ"),
            ("other", "Khác"),
        ),
    ),
    "industry": AttributeSpec(
        "Ngành nghề",
        "Cơ bản",
        (
            ("it", "Công nghệ thông tin"),
            ("finance", "Tài chính, ngân hàng"),
            ("education", "Giáo dục"),
            ("health", "Y tế"),
            ("business", "Kinh doanh, bán hàng"),
            ("marketing", "Marketing, truyền thông"),
            ("design", "Thiết kế, sáng tạo"),
            ("engineering", "Kỹ thuật, xây dựng"),
            ("hospitality", "Du lịch, nhà hàng, khách sạn"),
            ("public", "Nhà nước, phi lợi nhuận"),
            ("freelance", "Tự do"),
            ("student", "Sinh viên"),
            ("other", "Khác"),
        ),
    ),
    "marital_status": AttributeSpec(
        "Tình trạng hôn nhân",
        "Gia đình",
        (("single", "Độc thân"), ("divorced", "Đã ly hôn"), ("widowed", "Góa")),
    ),
    "has_children": AttributeSpec(
        "Con cái", "Gia đình", (("no", "Chưa có con"), ("yes", "Đã có con"))
    ),
    "wants_children": AttributeSpec(
        "Mong muốn có con",
        "Gia đình",
        (
            ("yes", "Muốn có con"),
            ("no", "Không muốn có con"),
            ("open", "Chưa quyết định"),
        ),
    ),
    "smoking": AttributeSpec(
        "Hút thuốc",
        "Lối sống",
        (
            ("never", "Không hút"),
            ("sometimes", "Thỉnh thoảng"),
            ("often", "Thường xuyên"),
        ),
    ),
    "drinking": AttributeSpec(
        "Uống rượu bia",
        "Lối sống",
        (("never", "Không uống"), ("social", "Khi giao lưu"), ("often", "Thường xuyên")),
    ),
    "exercise": AttributeSpec(
        "Tập thể thao",
        "Lối sống",
        (
            ("rarely", "Hiếm khi"),
            ("sometimes", "Thỉnh thoảng"),
            ("often", "Thường xuyên"),
        ),
    ),
    "pets": AttributeSpec(
        "Thú cưng",
        "Lối sống",
        (
            ("none", "Không nuôi"),
            ("dog", "Chó"),
            ("cat", "Mèo"),
            ("other", "Khác"),
            ("want", "Muốn nuôi"),
        ),
    ),
    "diet": AttributeSpec(
        "Chế độ ăn",
        "Lối sống",
        (
            ("omnivore", "Ăn tất cả"),
            ("vegetarian", "Ăn chay"),
            ("vegan", "Thuần chay"),
            ("other", "Khác"),
        ),
    ),
    "mbti": AttributeSpec(
        "MBTI",
        "Tính cách",
        tuple(
            (m, m.upper())
            for m in (
                "intj",
                "intp",
                "entj",
                "entp",
                "infj",
                "infp",
                "enfj",
                "enfp",
                "istj",
                "isfj",
                "estj",
                "esfj",
                "istp",
                "isfp",
                "estp",
                "esfp",
            )
        ),
    ),
    "love_language": AttributeSpec(
        "Ngôn ngữ tình yêu",
        "Tính cách",
        (
            ("words", "Lời nói yêu thương"),
            ("time", "Thời gian chất lượng"),
            ("gifts", "Quà tặng"),
            ("service", "Hành động quan tâm"),
            ("touch", "Cử chỉ thân mật"),
        ),
    ),
    "zodiac": AttributeSpec(
        "Cung hoàng đạo",
        "Tính cách",
        (
            ("aries", "Bạch Dương"),
            ("taurus", "Kim Ngưu"),
            ("gemini", "Song Tử"),
            ("cancer", "Cự Giải"),
            ("leo", "Sư Tử"),
            ("virgo", "Xử Nữ"),
            ("libra", "Thiên Bình"),
            ("scorpio", "Bọ Cạp"),
            ("sagittarius", "Nhân Mã"),
            ("capricorn", "Ma Kết"),
            ("aquarius", "Bảo Bình"),
            ("pisces", "Song Ngư"),
        ),
    ),
    "languages": AttributeSpec(
        "Ngôn ngữ",
        "Khác",
        (
            ("vi", "Tiếng Việt"),
            ("en", "Tiếng Anh"),
            ("ja", "Tiếng Nhật"),
            ("ko", "Tiếng Hàn"),
            ("zh", "Tiếng Trung"),
            ("fr", "Tiếng Pháp"),
            ("other", "Khác"),
        ),
        multi=True,
    ),
    "religion": AttributeSpec(
        "Tôn giáo",
        "Khác",
        (
            ("none", "Không theo tôn giáo"),
            ("buddhism", "Phật giáo"),
            ("catholic", "Công giáo"),
            ("protestant", "Tin lành"),
            ("caodai", "Cao đài"),
            ("hoahao", "Hòa hảo"),
            ("ancestor", "Thờ cúng tổ tiên"),
            ("islam", "Hồi giáo"),
            ("other", "Khác"),
        ),
    ),
}

# Sensitive personal data (Nghị định 13/2023): only the matching algorithm and
# the owner read these, never another viewer.
MATCHING_ONLY: Final = frozenset({"marital_status", "religion"})

ATTRIBUTE_KEYS: Final = frozenset(ATTRIBUTES)
PUBLIC_SINGLE_KEYS: Final = tuple(
    key for key, spec in ATTRIBUTES.items() if not spec.multi and key not in MATCHING_ONLY
)

INTEREST_GROUPS: Final[dict[str, tuple[Option, ...]]] = {
    "Ăn uống": (
        ("cafe", "Cà phê"),
        ("milk_tea", "Trà sữa"),
        ("street_food", "Ẩm thực đường phố"),
        ("cooking", "Nấu ăn"),
        ("baking", "Làm bánh"),
        ("bbq", "Đồ nướng"),
        ("spicy", "Ăn cay"),
        ("wine", "Rượu vang"),
        ("craft_beer", "Bia thủ công"),
        ("brunch", "Brunch"),
    ),
    "Du lịch": (
        ("backpacking", "Du lịch bụi"),
        ("beach", "Biển"),
        ("trekking", "Trekking"),
        ("camping", "Cắm trại"),
        ("road_trip", "Phượt"),
        ("city_break", "Khám phá thành phố"),
        ("photography", "Nhiếp ảnh"),
        ("resort", "Nghỉ dưỡng"),
        ("abroad", "Du lịch nước ngoài"),
        ("local_culture", "Văn hóa địa phương"),
    ),
    "Âm nhạc & nghệ thuật": (
        ("pop", "Nhạc pop"),
        ("indie", "Indie"),
        ("rock", "Rock"),
        ("edm", "EDM"),
        ("kpop", "K-pop"),
        ("guitar", "Guitar"),
        ("singing", "Ca hát"),
        ("painting", "Vẽ"),
        ("museum", "Bảo tàng & triển lãm"),
        ("theatre", "Sân khấu"),
    ),
    "Thể thao": (
        ("gym", "Gym"),
        ("yoga", "Yoga"),
        ("running", "Chạy bộ"),
        ("swimming", "Bơi lội"),
        ("cycling", "Đạp xe"),
        ("badminton", "Cầu lông"),
        ("football", "Bóng đá"),
        ("tennis", "Tennis"),
        ("golf", "Golf"),
        ("martial_arts", "Võ thuật"),
    ),
    "Giải trí": (
        ("movies", "Phim ảnh"),
        ("books", "Đọc sách"),
        ("gaming", "Chơi game"),
        ("anime", "Anime"),
        ("comics", "Truyện tranh"),
        ("karaoke", "Karaoke"),
        ("board_games", "Board game"),
        ("podcast", "Podcast"),
        ("standup", "Hài độc thoại"),
        ("series", "Phim bộ"),
    ),
    "Phong cách sống": (
        ("pet_lover", "Yêu thú cưng"),
        ("gardening", "Làm vườn"),
        ("fashion", "Thời trang"),
        ("diy", "Thủ công"),
        ("volunteering", "Tình nguyện"),
        ("investing", "Đầu tư"),
        ("learn_language", "Học ngoại ngữ"),
        ("tech", "Công nghệ"),
        ("startup", "Khởi nghiệp"),
        ("meditation", "Thiền"),
    ),
}

INTEREST_VALUES: Final = frozenset(
    value for options in INTEREST_GROUPS.values() for value, _ in options
)


def values_of(key: str) -> frozenset[str]:
    return frozenset(value for value, _ in ATTRIBUTES[key].options)


# ---- Icons ------------------------------------------------------------------
# Emoji the app shows beside a label, written by CLDR name through the `emoji`
# library so they read and review as words. Kept apart from the option tuples
# so a missing icon degrades to a plain label rather than breaking a value.

# Older Android phones, still common in Vietnam, draw an empty box for newer
# emoji. Every icon must exist in Emoji 12.0 (2019) or earlier.
MAX_EMOJI_VERSION: Final = 12.0


def _e(cldr_name: str) -> str:
    char: str = emoji.emojize(f":{cldr_name}:")
    if char == f":{cldr_name}:":
        raise ValueError(f"unknown emoji name {cldr_name!r}")
    return char


ATTRIBUTE_ICONS: Final[dict[str, str]] = {
    "intent": _e("revolving_hearts"),
    "education": _e("graduation_cap"),
    "industry": _e("briefcase"),
    "marital_status": _e("ring"),
    "has_children": _e("baby"),
    "wants_children": _e("baby_bottle"),
    "smoking": _e("cigarette"),
    "drinking": _e("wine_glass"),
    "exercise": _e("person_lifting_weights"),
    "pets": _e("paw_prints"),
    "diet": _e("green_salad"),
    "mbti": _e("brain"),
    "love_language": _e("love_letter"),
    "zodiac": _e("sparkles"),
    "languages": _e("speaking_head"),
    "religion": _e("folded_hands"),
}

OPTION_ICONS: Final[dict[str, dict[str, str]]] = {
    "intent": {
        "serious": _e("ring"),
        "casual": _e("clinking_glasses"),
        "friends": _e("waving_hand"),
        "unsure": _e("thinking_face"),
    },
    "education": {
        "high_school": _e("school"),
        "college": _e("blue_book"),
        "bachelor": _e("graduation_cap"),
        "master": _e("scroll"),
        "doctorate": _e("microscope"),
        "other": _e("books"),
    },
    "industry": {
        "it": _e("laptop"),
        "finance": _e("bank"),
        "education": _e("woman_teacher"),
        "health": _e("stethoscope"),
        "business": _e("shopping_bags"),
        "marketing": _e("megaphone"),
        "design": _e("artist_palette"),
        "engineering": _e("building_construction"),
        "hospitality": _e("hotel"),
        "public": _e("classical_building"),
        "freelance": _e("house"),
        "student": _e("backpack"),
        "other": _e("briefcase"),
    },
    "marital_status": {
        "single": _e("person_raising_hand"),
        "divorced": _e("counterclockwise_arrows_button"),
        "widowed": _e("dove"),
    },
    "has_children": {
        "no": _e("prohibited"),
        "yes": _e("baby"),
    },
    "wants_children": {
        "yes": _e("baby_bottle"),
        "no": _e("person_gesturing_NO"),
        "open": _e("person_shrugging"),
    },
    "smoking": {
        "never": _e("no_smoking"),
        "sometimes": _e("dashing_away"),
        "often": _e("cigarette"),
    },
    "drinking": {
        "never": _e("beverage_box"),
        "social": _e("clinking_glasses"),
        "often": _e("clinking_beer_mugs"),
    },
    "exercise": {
        "rarely": _e("couch_and_lamp"),
        "sometimes": _e("person_walking"),
        "often": _e("person_running"),
    },
    "pets": {
        "none": _e("prohibited"),
        "dog": _e("dog_face"),
        "cat": _e("cat_face"),
        "other": _e("rabbit_face"),
        "want": _e("paw_prints"),
    },
    "diet": {
        "omnivore": _e("meat_on_bone"),
        "vegetarian": _e("broccoli"),
        "vegan": _e("seedling"),
        "other": _e("fork_and_knife_with_plate"),
    },
    "love_language": {
        "words": _e("speech_balloon"),
        "time": _e("hourglass_not_done"),
        "gifts": _e("wrapped_gift"),
        "service": _e("palms_up_together"),
        "touch": _e("smiling_face_with_open_hands"),
    },
    "zodiac": {
        "aries": _e("Aries"),
        "taurus": _e("Taurus"),
        "gemini": _e("Gemini"),
        "cancer": _e("Cancer"),
        "leo": _e("Leo"),
        "virgo": _e("Virgo"),
        "libra": _e("Libra"),
        "scorpio": _e("Scorpio"),
        "sagittarius": _e("Sagittarius"),
        "capricorn": _e("Capricorn"),
        "aquarius": _e("Aquarius"),
        "pisces": _e("Pisces"),
    },
    "languages": {
        "vi": _e("Vietnam"),
        "en": _e("United_Kingdom"),
        "ja": _e("Japan"),
        "ko": _e("South_Korea"),
        "zh": _e("China"),
        "fr": _e("France"),
        "other": _e("globe_with_meridians"),
    },
    "religion": {
        "none": _e("white_circle"),
        "buddhism": _e("wheel_of_dharma"),
        "catholic": _e("latin_cross"),
        "protestant": _e("church"),
        "caodai": _e("eye"),
        "hoahao": _e("hibiscus"),
        "ancestor": _e("red_paper_lantern"),
        "islam": _e("star_and_crescent"),
        "other": _e("folded_hands"),
    },
}

INTEREST_GROUP_ICONS: Final[dict[str, str]] = {
    "Ăn uống": _e("steaming_bowl"),
    "Du lịch": _e("airplane"),
    "Âm nhạc & nghệ thuật": _e("musical_note"),
    "Thể thao": _e("soccer_ball"),
    "Giải trí": _e("clapper_board"),
    "Phong cách sống": _e("herb"),
}

INTEREST_ICONS: Final[dict[str, str]] = {
    "cafe": _e("hot_beverage"),
    "milk_tea": _e("cup_with_straw"),
    "street_food": _e("oden"),
    "cooking": _e("cooking"),
    "baking": _e("cupcake"),
    "bbq": _e("meat_on_bone"),
    "spicy": _e("hot_pepper"),
    "wine": _e("wine_glass"),
    "craft_beer": _e("beer_mug"),
    "brunch": _e("pancakes"),
    "backpacking": _e("backpack"),
    "beach": _e("beach_with_umbrella"),
    "trekking": _e("hiking_boot"),
    "camping": _e("tent"),
    "road_trip": _e("motorcycle"),
    "city_break": _e("cityscape"),
    "photography": _e("camera"),
    "resort": _e("desert_island"),
    "abroad": _e("globe_showing_Europe-Africa"),
    "local_culture": _e("Japanese_castle"),
    "pop": _e("microphone"),
    "indie": _e("headphone"),
    "rock": _e("guitar"),
    "edm": _e("control_knobs"),
    "kpop": _e("purple_heart"),
    "guitar": _e("guitar"),
    "singing": _e("studio_microphone"),
    "painting": _e("paintbrush"),
    "museum": _e("framed_picture"),
    "theatre": _e("performing_arts"),
    "gym": _e("person_lifting_weights"),
    "yoga": _e("person_in_lotus_position"),
    "running": _e("person_running"),
    "swimming": _e("person_swimming"),
    "cycling": _e("person_biking"),
    "badminton": _e("badminton"),
    "football": _e("soccer_ball"),
    "tennis": _e("tennis"),
    "golf": _e("flag_in_hole"),
    "martial_arts": _e("martial_arts_uniform"),
    "movies": _e("clapper_board"),
    "books": _e("books"),
    "gaming": _e("video_game"),
    "anime": _e("fish_cake_with_swirl"),
    "comics": _e("open_book"),
    "karaoke": _e("microphone"),
    "board_games": _e("game_die"),
    "podcast": _e("headphone"),
    "standup": _e("face_with_tears_of_joy"),
    "series": _e("television"),
    "pet_lover": _e("paw_prints"),
    "gardening": _e("seedling"),
    "fashion": _e("dress"),
    "diy": _e("thread"),
    "volunteering": _e("handshake"),
    "investing": _e("chart_increasing"),
    "learn_language": _e("speaking_head"),
    "tech": _e("laptop"),
    "startup": _e("rocket"),
    "meditation": _e("candle"),
}


def _check_icon_versions() -> None:
    """Fail at import, so a too-new emoji never reaches a release."""
    icons = [
        *ATTRIBUTE_ICONS.values(),
        *(icon for group in OPTION_ICONS.values() for icon in group.values()),
        *INTEREST_GROUP_ICONS.values(),
        *INTEREST_ICONS.values(),
    ]
    too_new = [icon for icon in icons if emoji.EMOJI_DATA[icon]["E"] > MAX_EMOJI_VERSION]
    if too_new:
        raise ValueError(f"emoji newer than {MAX_EMOJI_VERSION}: {too_new}")


_check_icon_versions()
