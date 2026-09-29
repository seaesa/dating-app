import type { Storage } from "./storage";

/**
 * localStorage.
 *
 * The refresh token is readable by any script on the origin, which is the
 * accepted tradeoff recorded in spec §10; rotation and a revocable jti limit
 * what a stolen token is worth. Upgrading to a httpOnly cookie replaces this
 * file and nothing else.
 *
 * Reads are forgiving and writes are not. localStorage throws rather than
 * returning null in some privacy modes: a failed read means "signed out", which
 * the app can act on, but a failed write that reports success would leave the
 * user signed in until the tab closes and then silently signed out — so a write
 * failure propagates and signIn refuses.
 */
function required(): globalThis.Storage {
  const store = globalThis.localStorage;
  if (!store) throw new Error("localStorage is unavailable");
  return store;
}

export const storage: Storage = {
  get: (key) => {
    try {
      return Promise.resolve(required().getItem(key) ?? null);
    } catch {
      return Promise.resolve(null);
    }
  },
  set: async (key, value) => {
    required().setItem(key, value);
  },
  remove: async (key) => {
    required().removeItem(key);
  },
};
