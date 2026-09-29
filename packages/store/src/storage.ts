export interface Storage {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
}

/**
 * Platform resolution happens in the bundler, not here.
 *
 * Metro picks `storage.native.ts`; Next picks `storage.web.ts` through the
 * `.web.*` entries in its resolveExtensions. This file is what TypeScript sees,
 * and what would run if neither matched — which should never happen, so it
 * fails loudly rather than silently losing a token.
 */
export const storage: Storage = {
  get: () => Promise.reject(new Error("No storage implementation for this platform")),
  set: () => Promise.reject(new Error("No storage implementation for this platform")),
  remove: () => Promise.reject(new Error("No storage implementation for this platform")),
};
