import { toE164 } from "@repo/core";

/**
 * The submit rule for the phone screen.
 *
 * The Zod schema generated from OpenAPI checks length only, so a number that
 * cannot be parsed would reach the API and come back 422 after a round trip.
 * Normalizing here also means the API receives one representation per number,
 * which is what its unique index depends on.
 *
 * Extracted from the component so it is testable: rendering these screens
 * needs Metro, because @rn-primitives publishes JSX that only Metro parses.
 */
export type PhoneSubmission = { ok: true; e164: string } | { ok: false; message: string };

export function preparePhone(raw: string): PhoneSubmission {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: false, message: "Nhập số điện thoại" };
  }
  const e164 = toE164(trimmed, "VN");
  if (e164 === null) {
    return { ok: false, message: "Số điện thoại không hợp lệ" };
  }
  return { ok: true, e164 };
}
