/** The youngest age allowed to use the app. */
export const MIN_AGE = 18;

const INPUT_PATTERN = /^(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})$/;

/** "DD / MM / YYYY" → "YYYY-MM-DD", or null when it is not a real calendar date. */
export function toIsoDate(formatted: string): string | null {
  const match = INPUT_PATTERN.exec(formatted.trim());
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  const real =
    date.getFullYear() === Number(yyyy) &&
    date.getMonth() === Number(mm) - 1 &&
    date.getDate() === Number(dd);
  return real ? `${yyyy}-${mm}-${dd}` : null;
}

/** "YYYY-MM-DD" → "DD / MM / YYYY", as the date input shows it. */
export function formatBirthDate(iso: string): string {
  const [yyyy, mm, dd] = iso.split("-");
  return yyyy && mm && dd ? `${dd} / ${mm} / ${yyyy}` : "";
}

/** Whole years old on `today` for a "YYYY-MM-DD" birth date. */
export function ageOn(iso: string, today: Date = new Date()): number {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const beforeBirthday =
    today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
  return today.getFullYear() - y - (beforeBirthday ? 1 : 0);
}
