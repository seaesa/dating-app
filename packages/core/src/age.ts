/**
 * Age from a birth year. The API stores only the year, never a full birth
 * date, so age is necessarily approximate — this is a privacy decision
 * (spec §5.2), not an oversight.
 */
export function ageFromBirthYear(birthYear: number, now: Date = new Date()): number {
  const age = now.getUTCFullYear() - birthYear;
  if (age < 0) {
    throw new RangeError(`birthYear ${birthYear} is in the future`);
  }
  return age;
}
