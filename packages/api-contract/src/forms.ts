import { ageOn, APP_NAME, MIN_AGE, toIsoDate } from "@repo/core";

import type { ApiError } from "./client";

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

const MAIN_PHOTO_ERRORS: Record<string, string> = {
  no_face: "Ảnh chính cần thấy rõ khuôn mặt bạn. Hãy chọn ảnh khác nhé.",
  face_too_small: "Khuôn mặt trong ảnh chính quá nhỏ. Hãy chọn ảnh chụp gần hơn.",
  multiple_faces: "Ảnh chính chỉ nên có mình bạn.",
  unreadable: "Không đọc được ảnh này. Hãy thử ảnh khác.",
  error: "Chưa kiểm tra được ảnh. Thử lại nhé.",
  face_check_pending: "Ảnh chính đang được kiểm tra. Thử lại sau giây lát nhé.",
};

/**
 * Why the API refused a main photo, from the `photoMediaIds` reason of its
 * 422, or null when the error is something else.
 */
export function mainPhotoError(error: unknown): string | null {
  const reason = (error as ApiError | null)?.response?.data?.errors?.photoMediaIds?.[0];
  return reason ? (MAIN_PHOTO_ERRORS[reason] ?? null) : null;
}
