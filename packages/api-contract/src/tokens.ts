export interface TokenPairValue {
  accessToken: string | null;
  refreshToken: string | null;
}

/**
 * How the client reads and writes tokens.
 *
 * An interface rather than a concrete store: this package must not import
 * expo-secure-store or touch localStorage, or it stops being usable from both
 * platforms. The app injects an implementation at startup.
 */
export interface TokenProvider {
  /** Synchronous: it runs on every request, so it reads from memory. */
  getAccessToken: () => string | null;
  getRefreshToken: () => Promise<string | null>;
  setTokens: (tokens: TokenPairValue) => Promise<void>;
  clear: () => Promise<void>;
}
