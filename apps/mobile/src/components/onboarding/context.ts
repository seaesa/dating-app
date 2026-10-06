import * as React from "react";

import type { ProfileOptionsRead, UserRead } from "@repo/api-contract";

export interface OnboardingContextValue {
  me: UserRead;
  options: ProfileOptionsRead;
  /** Keep the server's latest copy of the account, here and in the query cache. */
  accept: (next: UserRead) => void;
  /** Go to the following step; after the last one, finish sign-up. */
  next: () => Promise<void>;
  /** Null on the first step. */
  back: (() => void) | null;
  finish: () => Promise<void>;
  index: number;
  total: number;
}

export const OnboardingContext = React.createContext<OnboardingContextValue | null>(null);

export function useOnboarding(): OnboardingContextValue {
  const value = React.useContext(OnboardingContext);
  if (!value) throw new Error("useOnboarding must be used inside OnboardingFlow");
  return value;
}
