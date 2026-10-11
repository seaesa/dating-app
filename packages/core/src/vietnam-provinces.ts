/**
 * Vietnam 63 provinces and centrally-run cities centroid coordinates [longitude, latitude].
 * GeoJSON Point order: [longitude, latitude].
 */

export const VIETNAM_PROVINCE_CENTROIDS: Record<string, [number, number]> = {
  "ha noi": [105.8542, 21.0285],
  "tp ho chi minh": [106.6297, 10.8231],
  "ho chi minh": [106.6297, 10.8231],
  "da nang": [108.2068, 16.0544],
  "hai phong": [106.6881, 20.8449],
  "can tho": [105.7844, 10.0452],
  "an giang": [105.1259, 10.3759],
  "ba ria vung tau": [107.1683, 10.4966],
  "vung tau": [107.1683, 10.4966],
  "bac giang": [106.1946, 21.2731],
  "bac kan": [105.8348, 22.147],
  "bac lieu": [105.7244, 9.2941],
  "bac ninh": [106.0747, 21.1861],
  "ben tre": [106.3756, 10.2433],
  "binh dinh": [109.0745, 14.1667],
  "binh duong": [106.6521, 11.0067],
  "binh phuoc": [106.8833, 11.75],
  "binh thuan": [108.1, 11.0833],
  "ca mau": [105.15, 9.1769],
  "cao bang": [106.2575, 22.6667],
  "dak lak": [108.0383, 12.6667],
  "dak nong": [107.6833, 12.0],
  "dien bien": [103.0167, 21.3833],
  "dong nai": [106.9442, 10.9574],
  "dong thap": [105.6333, 10.4667],
  "gia lai": [108.0, 13.9833],
  "ha giang": [104.9833, 22.8167],
  "ha nam": [105.9167, 20.5833],
  "ha tinh": [105.9, 18.3333],
  "hai duong": [106.3167, 20.9333],
  "hau giang": [105.4667, 9.7833],
  "hoa binh": [105.3333, 20.8167],
  "hung yen": [106.05, 20.65],
  "khanh hoa": [109.1967, 12.2388],
  "nha trang": [109.1967, 12.2388],
  "kien giang": [105.0833, 10.0167],
  "kon tum": [108.0, 14.35],
  "lai chau": [103.4667, 22.4],
  "lam dong": [108.4583, 11.9404],
  "da lat": [108.4583, 11.9404],
  "lang son": [106.75, 21.85],
  "lao cai": [103.9667, 22.4833],
  "long an": [106.4, 10.5333],
  "nam dinh": [106.1667, 20.4333],
  "nghe an": [105.6813, 18.6734],
  vinh: [105.6813, 18.6734],
  "ninh binh": [105.975, 20.25],
  "ninh thuan": [108.9833, 11.5667],
  "phan rang": [108.9833, 11.5667],
  "phu tho": [105.2167, 21.3167],
  "phu yen": [109.0833, 13.0833],
  "tuy hoa": [109.0833, 13.0833],
  "quang binh": [106.6, 17.4833],
  "dong hoi": [106.6, 17.4833],
  "quang nam": [108.338, 15.5994],
  "hoi an": [108.338, 15.8801],
  "quang ngai": [108.8, 15.1167],
  "quang ninh": [107.0833, 20.95],
  "ha long": [107.0833, 20.95],
  "quang tri": [107.1833, 16.75],
  "soc trang": [105.9667, 9.6],
  "son la": [103.9, 21.3167],
  "tay ninh": [106.1, 11.3],
  "thai binh": [106.3333, 20.45],
  "thai nguyen": [105.8333, 21.5833],
  "thanh hoa": [105.7765, 19.8067],
  "thua thien hue": [107.5909, 16.4637],
  hue: [107.5909, 16.4637],
  "tien giang": [106.35, 10.35],
  "tra vinh": [106.3333, 9.9333],
  "tuyen quang": [105.2167, 21.8167],
  "vinh long": [105.9667, 10.25],
  "vinh phuc": [105.6, 21.3],
  "yen bai": [104.8667, 21.7],
};

export function normalizeCityName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\b(thanh pho|tinh|tp\.?|city|province)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

export function getProvinceCentroid(
  name: string | null | undefined,
): [number, number] | null {
  if (!name) return null;
  const normalized = normalizeCityName(name);
  if (!normalized) return null;

  if (VIETNAM_PROVINCE_CENTROIDS[normalized]) {
    return VIETNAM_PROVINCE_CENTROIDS[normalized];
  }

  for (const [key, coords] of Object.entries(VIETNAM_PROVINCE_CENTROIDS)) {
    if (` ${normalized} `.includes(` ${key} `) || normalized.endsWith(` ${key}`)) {
      return coords;
    }
  }

  for (const [key, coords] of Object.entries(VIETNAM_PROVINCE_CENTROIDS)) {
    if (normalized.includes(key)) {
      return coords;
    }
  }

  return null;
}
