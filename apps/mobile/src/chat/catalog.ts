import { useQuery } from "@tanstack/react-query";

import { profileOptionsQuery, type ProfileOptionsRead } from "@repo/api-contract";
import { DEFAULT_INTEREST_LABELS } from "@repo/ui";

/**
 * Labels and emoji for profile values come from the API catalog, where the
 * emoji are chosen by name and capped at Emoji 12 so older Android phones
 * draw them. The app never hard-codes either.
 */
export interface CatalogEntry {
  label: string;
  icon: string | null;
}

export const useCatalog = () => useQuery(profileOptionsQuery()).data;

/** Offline Vietnamese fallbacks for all catalog attribute values. */
export const FALLBACK_OPTIONS: Record<string, Record<string, string>> = {
  intent: {
    serious: "Mối quan hệ nghiêm túc",
    casual: "Làm quen, hẹn hò thoải mái",
    friends: "Kết bạn",
    unsure: "Chưa chắc chắn",
    // Synonyms / legacy aliases
    serious_relationship: "Mối quan hệ nghiêm túc",
    marriage: "Hướng tới hôn nhân",
    dating: "Hẹn hò tìm hiểu",
    friendship: "Tìm bạn cùng sở thích",
  },
  education: {
    high_school: "Trung học",
    college: "Cao đẳng",
    bachelor: "Đại học",
    master: "Thạc sĩ",
    doctorate: "Tiến sĩ",
    other: "Khác",
  },
  industry: {
    it: "Công nghệ thông tin",
    finance: "Tài chính, ngân hàng",
    education: "Giáo dục",
    health: "Y tế",
    business: "Kinh doanh, bán hàng",
    marketing: "Marketing, truyền thông",
    design: "Thiết kế, sáng tạo",
    engineering: "Kỹ thuật, xây dựng",
    hospitality: "Du lịch, nhà hàng, khách sạn",
    public: "Nhà nước, phi lợi nhuận",
    freelance: "Tự do",
    student: "Sinh viên",
    other: "Khác",
  },
  smoking: {
    never: "Không hút",
    sometimes: "Thỉnh thoảng",
    often: "Thường xuyên",
  },
  drinking: {
    never: "Không uống",
    social: "Khi giao lưu",
    often: "Thường xuyên",
  },
  exercise: {
    rarely: "Hiếm khi",
    sometimes: "Thỉnh thoảng",
    often: "Thường xuyên",
  },
  pets: {
    none: "Không nuôi",
    dog: "Chó",
    cat: "Mèo",
    want: "Muốn nuôi",
    other: "Khác",
  },
  marital_status: {
    single: "Độc thân",
    divorced: "Đã ly hôn",
    widowed: "Góa",
  },
  has_children: {
    no: "Chưa có con",
    yes: "Đã có con",
  },
  hasChildren: {
    no: "Chưa có con",
    yes: "Đã có con",
  },
  wants_children: {
    yes: "Muốn có con",
    no: "Không muốn có con",
    open: "Chưa quyết định",
  },
  wantsChildren: {
    yes: "Muốn có con",
    no: "Không muốn có con",
    open: "Chưa quyết định",
  },
  diet: {
    omnivore: "Ăn tất cả",
    vegetarian: "Ăn chay",
    vegan: "Thuần chay",
    other: "Khác",
  },
  zodiac: {
    aries: "Bạch Dương",
    taurus: "Kim Ngưu",
    gemini: "Song Tử",
    cancer: "Cự Giải",
    leo: "Sư Tử",
    virgo: "Xử Nữ",
    libra: "Thiên Bình",
    scorpio: "Bọ Cạp",
    sagittarius: "Nhân Mã",
    capricorn: "Ma Kết",
    aquarius: "Bảo Bình",
    pisces: "Song Ngư",
  },
  love_language: {
    words: "Lời nói yêu thương",
    time: "Thời gian chất lượng",
    gifts: "Quà tặng",
    service: "Hành động quan tâm",
    touch: "Cử chỉ thân mật",
  },
  loveLanguage: {
    words: "Lời nói yêu thương",
    time: "Thời gian chất lượng",
    gifts: "Quà tặng",
    service: "Hành động quan tâm",
    touch: "Cử chỉ thân mật",
  },
};

export const ATTRIBUTE_METADATA: Record<string, { title: string; icon: string }> = {
  intent: { title: "Mục đích", icon: "🎯" },
  education: { title: "Học vấn", icon: "🎓" },
  industry: { title: "Nghề nghiệp", icon: "💼" },
  heightCm: { title: "Chiều cao", icon: "📏" },
  height: { title: "Chiều cao", icon: "📏" },
  hometown: { title: "Quê quán", icon: "🏡" },
  exercise: { title: "Thể thao", icon: "🏃" },
  drinking: { title: "Rượu bia", icon: "🍷" },
  smoking: { title: "Hút thuốc", icon: "🚬" },
  pets: { title: "Thú cưng", icon: "🐾" },
  diet: { title: "Chế độ ăn", icon: "🥗" },
  zodiac: { title: "Cung hoàng đạo", icon: "⭐" },
  mbti: { title: "MBTI", icon: "🧠" },
  loveLanguage: { title: "Ngôn ngữ tình yêu", icon: "❤️" },
  love_language: { title: "Ngôn ngữ tình yêu", icon: "❤️" },
  hasChildren: { title: "Con cái", icon: "👶" },
  has_children: { title: "Con cái", icon: "👶" },
  wantsChildren: { title: "Muốn có con", icon: "🍼" },
  wants_children: { title: "Muốn có con", icon: "🍼" },
};

export function interestEntry(
  catalog: ProfileOptionsRead | undefined,
  key: string,
): CatalogEntry {
  for (const group of catalog?.interestGroups ?? []) {
    const option = group.options.find((o) => o.value === key);
    if (option) return { label: option.label, icon: option.icon ?? null };
  }
  const fallback = DEFAULT_INTEREST_LABELS[key];
  if (fallback) return { label: fallback.label, icon: fallback.icon ?? null };
  return { label: key.replace(/_/g, " "), icon: null };
}

export function attributeEntry(
  catalog: ProfileOptionsRead | undefined,
  key: string,
  value: string | number | null | undefined,
): (CatalogEntry & { title: string }) | null {
  if (value === null || value === undefined || value === "") return null;
  const strVal = String(value);

  // Height special handling
  if (key === "heightCm" || key === "height") {
    return {
      title: "Chiều cao",
      label: `${strVal} cm`,
      icon: "📏",
    };
  }
  // Hometown special handling
  if (key === "hometown") {
    return {
      title: "Quê quán",
      label: strVal,
      icon: "🏡",
    };
  }

  const attribute = catalog?.attributes.find((a) => a.key === key);
  const option = attribute?.options.find((o) => o.value === strVal);

  const fallbackTitle = ATTRIBUTE_METADATA[key]?.title ?? attribute?.label ?? key;
  const fallbackIcon =
    option?.icon ?? attribute?.icon ?? ATTRIBUTE_METADATA[key]?.icon ?? "✨";
  const fallbackLabel =
    option?.label ?? FALLBACK_OPTIONS[key]?.[strVal] ?? strVal.replace(/_/g, " ");

  return {
    title: fallbackTitle,
    label: fallbackLabel,
    icon: fallbackIcon,
  };
}
