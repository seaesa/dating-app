import { create } from "zustand";

import type { TokenProvider } from "@repo/api-contract";

import { storage } from "./storage";

const REFRESH_TOKEN_KEY = "terdin.refreshToken";
const ONBOARDING_KEY = "terdin.onboardingPending";

interface SignInTokens {
  accessToken: string;
  refreshToken: string;
  userId?: string;
  /** From verifyOtp's isNewUser: this user has not filled in a profile yet. */
  onboardingPending?: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  /**
   * True between verifyOtp on a new account and the first successful profile
   * save. Persisted, because killing the app on the onboarding form must not
   * look like a finished registration on the next cold start.
   */
  onboardingPending: boolean;
  /** False until storage has been read. Routing before this bounces a signed-in user. */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  signIn: (tokens: SignInTokens) => Promise<void>;
  /** A 15-minute rotation, not a new session: deliberately quiet. */
  rotateTokens: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Run when the identity behind the app changes — sign-in or sign-out, never a
 * token rotation.
 *
 * The query cache is keyed by endpoint, not by user, so without a reset at this
 * boundary the next user is served the previous user's cached profile. The store
 * cannot import the query client (that would invert the dependency), so the app
 * registers the reset here instead.
 */
const sessionListeners = new Set<() => void>();

export function onSessionChange(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

function notifySessionChange(): void {
  for (const listener of sessionListeners) listener();
}

/**
 * Revokes a refresh token server side. Registered by the app, because calling
 * the generated SDK from here would make the store depend on a live client.
 */
let revokeSession: ((refreshToken: string) => Promise<unknown>) | null = null;

export function registerSessionRevoke(
  fn: ((refreshToken: string) => Promise<unknown>) | null,
): void {
  revokeSession = fn;
}

/**
 * Shared across concurrent hydrate() calls.
 *
 * The router and the API client can both trigger hydration on the first frame;
 * without this each would read storage separately.
 */
let hydrating: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  userId: null,
  onboardingPending: false,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return Promise.resolve();
    if (hydrating) return hydrating;

    hydrating = (async () => {
      let refreshToken: string | null = null;
      let onboardingPending = false;
      try {
        refreshToken = await storage.get(REFRESH_TOKEN_KEY);
        onboardingPending = (await storage.get(ONBOARDING_KEY)) === "1";
      } catch {
        // A locked keychain or a blocked storage API must not leave the app
        // stuck on a splash screen. Treat it as signed out.
      }
      set({ refreshToken, onboardingPending, hydrated: true });
    })();

    return hydrating.finally(() => {
      hydrating = null;
    });
  },

  signIn: async ({ accessToken, refreshToken, userId, onboardingPending = false }) => {
    // Persist BEFORE updating state: reporting success while the token was
    // never stored leaves the user signed in until the app restarts, then
    // mysteriously signed out.
    //
    // Only the refresh token is persisted. The access token lives 15 minutes,
    // so writing it to disk widens exposure for nothing.
    await storage.set(REFRESH_TOKEN_KEY, refreshToken);
    if (onboardingPending) {
      await storage.set(ONBOARDING_KEY, "1");
    } else {
      await storage.remove(ONBOARDING_KEY);
    }
    set({
      accessToken,
      refreshToken,
      onboardingPending,
      userId: userId ?? get().userId,
      hydrated: true,
    });
    notifySessionChange();
  },

  rotateTokens: async ({ accessToken, refreshToken }) => {
    await storage.set(REFRESH_TOKEN_KEY, refreshToken);
    set({ accessToken, refreshToken });
  },

  completeOnboarding: async () => {
    await storage.remove(ONBOARDING_KEY);
    set({ onboardingPending: false });
  },

  signOut: async () => {
    const { refreshToken } = get();

    // Best effort, and first: the token has to still exist to be revoked. A
    // failure here (offline, API down) must not refuse the sign-out the user
    // asked for — the token expires on its own.
    if (refreshToken && revokeSession) {
      try {
        await revokeSession(refreshToken);
      } catch {
        // Left to expire.
      }
    }

    try {
      await storage.remove(REFRESH_TOKEN_KEY);
      await storage.remove(ONBOARDING_KEY);
    } catch {
      // A locked keychain must not stop the session from ending. Rejecting here
      // used to abort the interceptor's teardown before it routed to login,
      // leaving the user on a dead session.
    }

    set({
      accessToken: null,
      refreshToken: null,
      userId: null,
      onboardingPending: false,
      hydrated: true,
    });
    notifySessionChange();
  },
}));

/** Bridge the store to @repo/api-contract without that package importing it. */
export function createTokenProvider(): TokenProvider {
  return {
    getAccessToken: () => useAuthStore.getState().accessToken,
    getRefreshToken: async () => {
      const state = useAuthStore.getState();
      // The interceptor can ask on the first 401, before anything called
      // hydrate() — reporting null here would sign the user out spuriously.
      if (!state.hydrated) await state.hydrate();
      return useAuthStore.getState().refreshToken;
    },
    setTokens: async ({ accessToken, refreshToken }) => {
      if (accessToken && refreshToken) {
        await useAuthStore.getState().rotateTokens({ accessToken, refreshToken });
      }
    },
    clear: async () => {
      await useAuthStore.getState().signOut();
    },
  };
}
