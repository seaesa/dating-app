import { z } from "zod";

/** Onboarding profile validation, shared by both apps. Bounds match `PublicProfileUpdate`. */

export const MIN_AGE = 18;
const MAX_AGE = 100;

export interface ProfileFormValues {
  nickname: string;
  birthYear: string;
  city: string;
}

export type ProfileFormResult =
  | { ok: true; body: { nickname: string; birthYear: number; city: string } }
  | { ok: false; error: string };

const currentYear = () => new Date().getFullYear();

const formSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(2, "Biệt danh cần ít nhất 2 ký tự")
    .max(32, "Biệt danh tối đa 32 ký tự"),
  birthYear: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Năm sinh không hợp lệ")
    .transform(Number)
    .refine((year) => year <= currentYear() - MIN_AGE, `Bạn phải từ ${MIN_AGE} tuổi`)
    .refine((year) => year >= currentYear() - MAX_AGE, "Năm sinh không hợp lệ"),
  city: z
    .string()
    .trim()
    .min(1, "Nhập thành phố")
    .max(64, "Tên thành phố tối đa 64 ký tự"),
});

export function parseProfileForm(values: ProfileFormValues): ProfileFormResult {
  const form = formSchema.safeParse(values);
  if (!form.success) {
    return {
      ok: false,
      error: form.error.issues[0]?.message ?? "Thông tin không hợp lệ",
    };
  }
  return { ok: true, body: form.data };
}
