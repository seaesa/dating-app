import type { MatchCriteria, UserRead } from "./generated/types.gen";

export type Gender = "male" | "female" | "other";

// ---- Onboarding -------------------------------------------------------------

export type OnboardingStep =
  "basics" | "showMe" | "intent" | "photos" | "about" | "habits" | "family" | "interests";

/** Photos a profile needs to go live; mirrors MIN_PHOTOS in the users service. */
export const MIN_PHOTOS = 2;

/** The order a new user meets the steps; the skippable ones come after photos. */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  "basics",
  "showMe",
  "intent",
  "photos",
  "about",
  "habits",
  "family",
  "interests",
];

/**
 * The first required step this account has not answered, read from server
 * data so a reinstall or a second device resumes in the right place. Null once
 * only the optional steps remain.
 */
export function firstMissingStep(me: UserRead): OnboardingStep | null {
  if (!me.profile.displayName || !me.account?.dateOfBirth || !me.profile.gender) {
    return "basics";
  }
  if (!me.account.criteria) return "showMe";
  if (me.account.photos.length < MIN_PHOTOS) return "photos";
  return null;
}

const DEFAULT_DISTANCE_KM = 25;

/**
 * The criteria a new user starts with: who they want to meet, an age range
 * around their own and a default distance, applied once a location is stored.
 */
export function defaultCriteria(me: UserRead, genders: Gender[]): MatchCriteria {
  const age = me.profile.age;
  return {
    genders,
    ageMin: Math.max(18, age - 5),
    ageMax: Math.min(99, age + 5),
    maxDistanceKm: DEFAULT_DISTANCE_KM,
  };
}
