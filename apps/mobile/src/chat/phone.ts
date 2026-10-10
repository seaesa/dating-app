import { formatPhone } from "@repo/core";

/** Zalo finds an account by its national number, digits only. */
export const zaloUrl = (e164: string) =>
  `https://zalo.me/${formatPhone(e164).replace(/\D/g, "")}`;

/** The owner's own number, shown to them in the consent sheet. */
export function maskPhone(e164: string): string {
  const digits = formatPhone(e164).replace(/\D/g, "");
  return digits.length < 7 ? "•••" : `${digits.slice(0, 4)} ••• ${digits.slice(-3)}`;
}
