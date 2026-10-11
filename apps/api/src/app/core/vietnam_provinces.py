"""Vietnam 63 provinces centroid coordinates [longitude, latitude].

GeoJSON Point order: [longitude, latitude].
"""

import re
import unicodedata

# Mapping of normalized canonical name to [longitude, latitude]
VIETNAM_PROVINCE_CENTROIDS: dict[str, tuple[float, float]] = {
    "ha noi": (105.8542, 21.0285),
    "tp ho chi minh": (106.6297, 10.8231),
    "ho chi minh": (106.6297, 10.8231),
    "da nang": (108.2068, 16.0544),
    "hai phong": (106.6881, 20.8449),
    "can tho": (105.7844, 10.0452),
    "an giang": (105.1259, 10.3759),
    "ba ria vung tau": (107.1683, 10.4966),
    "vung tau": (107.1683, 10.4966),
    "bac giang": (106.1946, 21.2731),
    "bac kan": (105.8348, 22.1470),
    "bac lieu": (105.7244, 9.2941),
    "bac ninh": (106.0747, 21.1861),
    "ben tre": (106.3756, 10.2433),
    "binh dinh": (109.0745, 14.1667),
    "binh duong": (106.6521, 11.0067),
    "binh phuoc": (106.8833, 11.7500),
    "binh thuan": (108.1000, 11.0833),
    "ca mau": (105.1500, 9.1769),
    "cao bang": (106.2575, 22.6667),
    "dak lak": (108.0383, 12.6667),
    "dak nong": (107.6833, 12.0000),
    "dien bien": (103.0167, 21.3833),
    "dong nai": (106.9442, 10.9574),
    "dong thap": (105.6333, 10.4667),
    "gia lai": (108.0000, 13.9833),
    "ha giang": (104.9833, 22.8167),
    "ha nam": (105.9167, 20.5833),
    "ha tinh": (105.9000, 18.3333),
    "hai duong": (106.3167, 20.9333),
    "hau giang": (105.4667, 9.7833),
    "hoa binh": (105.3333, 20.8167),
    "hung yen": (106.0500, 20.6500),
    "khanh hoa": (109.1967, 12.2388),
    "nha trang": (109.1967, 12.2388),
    "kien giang": (105.0833, 10.0167),
    "kon tum": (108.0000, 14.3500),
    "lai chau": (103.4667, 22.4000),
    "lam dong": (108.4583, 11.9404),
    "da lat": (108.4583, 11.9404),
    "lang son": (106.7500, 21.8500),
    "lao cai": (103.9667, 22.4833),
    "long an": (106.4000, 10.5333),
    "nam dinh": (106.1667, 20.4333),
    "nghe an": (105.6813, 18.6734),
    "vinh": (105.6813, 18.6734),
    "ninh binh": (105.9750, 20.2500),
    "ninh thuan": (108.9833, 11.5667),
    "phan rang": (108.9833, 11.5667),
    "phu tho": (105.2167, 21.3167),
    "phu yen": (109.0833, 13.0833),
    "tuy hoa": (109.0833, 13.0833),
    "quang binh": (106.6000, 17.4833),
    "dong hoi": (106.6000, 17.4833),
    "quang nam": (108.3380, 15.5994),
    "hoi an": (108.3380, 15.8801),
    "quang ngai": (108.8000, 15.1167),
    "quang ninh": (107.0833, 20.9500),
    "ha long": (107.0833, 20.9500),
    "quang tri": (107.1833, 16.7500),
    "soc trang": (105.9667, 9.6000),
    "son la": (103.9000, 21.3167),
    "tay ninh": (106.1000, 11.3000),
    "thai binh": (106.3333, 20.4500),
    "thai nguyen": (105.8333, 21.5833),
    "thanh hoa": (105.7765, 19.8067),
    "thua thien hue": (107.5909, 16.4637),
    "hue": (107.5909, 16.4637),
    "tien giang": (106.3500, 10.3500),
    "tra vinh": (106.3333, 9.9333),
    "tuyen quang": (105.2167, 21.8167),
    "vinh long": (105.9667, 10.2500),
    "vinh phuc": (105.6000, 21.3000),
    "yen bai": (104.8667, 21.7000),
}


def normalize_city_name(name: str | None) -> str:
    """Normalize city or address string to match Vietnam province keys.

    Removes diacritics, prefixes like 'thanh pho', 'tinh', 'tp', and extra punctuation.
    """
    if not name:
        return ""
    # Normalize unicode to decomposed form then remove combining marks
    s = unicodedata.normalize("NFD", name)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("đ", "d").replace("Đ", "d").lower()
    # Remove administrative prefixes
    s = re.sub(r"\b(thanh pho|tinh|tp\.?|city|province)\b", " ", s)
    # Remove non-alphanumeric except spaces
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    # Collapse whitespace
    return " ".join(s.split())


def get_province_centroid(name: str | None) -> tuple[float, float] | None:
    """Find the [longitude, latitude] coordinates for a given city / address name."""
    if not name:
        return None

    normalized = normalize_city_name(name)
    if not normalized:
        return None

    # 1. Exact match
    if normalized in VIETNAM_PROVINCE_CENTROIDS:
        return VIETNAM_PROVINCE_CENTROIDS[normalized]

    # 2. Check if any province key is a substring or word match
    for key, coords in VIETNAM_PROVINCE_CENTROIDS.items():
        if f" {key} " in f" {normalized} " or normalized.endswith(f" {key}"):
            return coords

    # 3. Check partial match (e.g. "hai chau da nang" -> matches "da nang")
    for key, coords in VIETNAM_PROVINCE_CENTROIDS.items():
        if key in normalized:
            return coords

    return None
