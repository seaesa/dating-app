import { ageOn, APP_NAME, MIN_AGE, toIsoDate } from "@repo/core";

/**
 * Validation for sign-up and profile forms, shared by both apps. Each returns
 * the Vietnamese message to show, or null when the value is acceptable; the
 * bounds match the API, so a value that passes here is never a 422.
 */

const MAX_AGE = 100;

export function displayNameError(name: string): string | null {
  const length = name.trim().length;
  if (length < 2) return "Tên cần ít nhất 2 ký tự";
  if (length > 32) return "Tên tối đa 32 ký tự";
  return null;
}

/** For "DD / MM / YYYY" as the date input formats it. */
export function birthDateError(formatted: string): string | null {
  const iso = toIsoDate(formatted);
  if (!iso) return "Nhập đầy đủ ngày sinh theo dạng DD / MM / YYYY";
  const age = ageOn(iso);
  if (age < MIN_AGE) return `Bạn cần từ ${MIN_AGE} tuổi trở lên để dùng ${APP_NAME}`;
  if (age > MAX_AGE) return "Ngày sinh không hợp lệ";
  return null;
}
