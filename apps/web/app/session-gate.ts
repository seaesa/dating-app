"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { useAuthStore } from "@repo/store";

/**
 * Route guards for the web app.
 *
 * Mobile gets these from expo-router layouts wrapping each stack; Next has no
 * equivalent for client-side state, so every guarded page calls one of these
 * hooks. They live in one file because three pages had to agree and only one of
 * them originally did.
 *
 * Every guard waits for `hydrated`. Routing before storage has been read
 * bounces a signed-in user to login on each reload.
 */

interface Session {
  hydrated: boolean;
  signedIn: boolean;
  onboardingPending: boolean;
}

function useSession(): Session {
  const hydrated = useAuthStore((s) => s.hydrated);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const onboardingPending = useAuthStore((s) => s.onboardingPending);
  return { hydrated, signedIn: Boolean(refreshToken), onboardingPending };
}

/** Where a signed-in user belongs, given whether they ever finished a profile. */
export function homeFor(onboardingPending: boolean): "/onboarding" | "/profile" {
  return onboardingPending ? "/onboarding" : "/profile";
}

/**
 * For pages that need a session. `requireOnboarded` sends a user who never
 * finished registering back to the form, rather than showing them a profile of
 * empty strings with no route out of it.
 */
export function useRequireSession({ requireOnboarded = true } = {}): Session {
  const router = useRouter();
  const session = useSession();
  const { hydrated, signedIn, onboardingPending } = session;

  React.useEffect(() => {
    if (!hydrated) return;
    if (!signedIn) {
      router.replace("/login");
      return;
    }
    if (requireOnboarded && onboardingPending) router.replace("/onboarding");
  }, [hydrated, signedIn, onboardingPending, requireOnboarded, router]);

  return session;
}

/**
 * For the login form and the root. Without it a user who signed in yesterday
 * opens the site and is handed the phone field again, with a perfectly good
 * refresh token sitting unread in localStorage.
 */
export function useRedirectWhenSignedIn(): Session {
  const router = useRouter();
  const session = useSession();
  const { hydrated, signedIn, onboardingPending } = session;

  React.useEffect(() => {
    if (hydrated && signedIn) router.replace(homeFor(onboardingPending));
  }, [hydrated, signedIn, onboardingPending, router]);

  return session;
}
