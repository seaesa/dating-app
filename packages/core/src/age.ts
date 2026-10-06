/**
 * Age from a birth year, as the public profile carries it. Approximate by up
 * to a year; the exact date stays in the private tier (see `ageOn`).
 */
export function ageFromBirthYear(birthYear: number, now: Date = new Date()): number {
  const age = now.getUTCFullYear() - birthYear;
  if (age < 0) {
    throw new RangeError(`birthYear ${birthYear} is in the future`);
  }
  return age;
}
