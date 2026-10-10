import parsePhoneNumberFromString, { type CountryCode } from "libphonenumber-js";

export const DEFAULT_PHONE_REGION: CountryCode = "VN";

/**
 * Normalize a user-typed phone number to E.164, or null when it is not a
 * valid number for the region. E.164 is the storage format everywhere: the
 * API's unique index depends on one number having exactly one representation.
 */
export function toE164(
  input: string,
  defaultRegion: CountryCode = DEFAULT_PHONE_REGION,
): string | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

  // Users paste the international-access form; libphonenumber wants "+".
  const candidate = trimmed.startsWith("00") ? `+${trimmed.slice(2)}` : trimmed;

  const parsed = parsePhoneNumberFromString(candidate, defaultRegion);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

export function isValidPhone(
  input: string,
  defaultRegion: CountryCode = DEFAULT_PHONE_REGION,
): boolean {
  return toE164(input, defaultRegion) !== null;
}

/**
 * A stored E.164 number the way people in its country write it:
 * "+84912345678" → "0912 345 678". Unparseable input comes back unchanged.
 */
export function formatPhone(
  e164: string,
  defaultRegion: CountryCode = DEFAULT_PHONE_REGION,
): string {
  const parsed = parsePhoneNumberFromString(e164, defaultRegion);
  return parsed ? parsed.formatNational() : e164;
}
