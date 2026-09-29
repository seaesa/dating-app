import { z } from "zod";

import { zPublicProfileUpdate } from "./generated/zod.gen";

/**
 * Form validation for the onboarding profile, shared by both platforms.
 *
 * It lives beside the generated schemas rather than in either app because the
 * rules are the contract's: each platform used to carry its own copy of a
 * looser check, so a 33-character nickname passed the form and came back as a
 * 422 the user could only read as "try again".
 *
 * Two stages, deliberately. The UX rules (required fields, minimum age) carry
 * messages a person can act on; the bounds come from `zPublicProfileUpdate`
 * itself, so raising a limit in the API moves the client with it.
 */

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
  nickname: z.string().trim().min(2, "Biệt danh cần ít nhất 2 ký tự"),
  birthYear: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Năm sinh không hợp lệ")
    .transform(Number)
    .refine((year) => year <= currentYear() - MIN_AGE, `Bạn phải từ ${MIN_AGE} tuổi`)
    .refine((year) => year >= currentYear() - MAX_AGE, "Năm sinh không hợp lệ"),
  city: z.string().trim().min(1, "Nhập thành phố"),
});

/** Field-specific messages for a bound that only the contract knows. */
const CONTRACT_MESSAGES: Record<string, (limit: number) => string> = {
  nickname: (limit) => `Biệt danh tối đa ${limit} ký tự`,
  city: (limit) => `Tên thành phố tối đa ${limit} ký tự`,
  birthYear: () => "Năm sinh không hợp lệ",
};

function describeContractIssue(issue: z.core.$ZodIssue): string {
  const field = String(issue.path[0] ?? "");
  const limit =
    "maximum" in issue && typeof issue.maximum === "number" ? issue.maximum : 0;
  return CONTRACT_MESSAGES[field]?.(limit) ?? "Thông tin không hợp lệ";
}

export function parseProfileForm(values: ProfileFormValues): ProfileFormResult {
  const form = formSchema.safeParse(values);
  if (!form.success) {
    return {
      ok: false,
      error: form.error.issues[0]?.message ?? "Thông tin không hợp lệ",
    };
  }

  // The contract has the final say, so the form can never accept a value the
  // API will refuse.
  const contract = zPublicProfileUpdate.safeParse(form.data);
  if (!contract.success) {
    return { ok: false, error: describeContractIssue(contract.error.issues[0]!) };
  }

  return { ok: true, body: form.data };
}
