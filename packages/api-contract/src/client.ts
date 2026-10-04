import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import type { Problem, TokenPair } from "./generated/types.gen";

/** Every API failure: an axios error whose body is an RFC 9457 problem. */
export type ApiError = AxiosError<Problem>;

/** Injected by the app, so this package touches neither localStorage nor the keychain. */
export interface TokenProvider {
  /** Synchronous: it runs on every request. */
  getAccessToken: () => string | null;
  getRefreshToken: () => Promise<string | null>;
  setTokens: (tokens: TokenPair) => Promise<void>;
  clear: () => Promise<void>;
}

export interface ApiClientOptions {
  tokens: TokenProvider;
  /** Called once when the session cannot be refreshed, so the app can route to login. */
  onAuthFailure: () => void;
  baseURL?: string;
}

const REFRESH_PATH = "/v1/auth/refresh";

// Next and Expo inline these at build time, so each is read as a literal.
export const http = axios.create({
  baseURL:
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000",
});

let interceptors: { request: number; response: number } | null = null;

/** Call once at app startup. Calling again replaces the previous setup. */
export function configureApiClient({ tokens, onAuthFailure, baseURL }: ApiClientOptions) {
  if (baseURL) http.defaults.baseURL = baseURL;
  if (interceptors) {
    http.interceptors.request.eject(interceptors.request);
    http.interceptors.response.eject(interceptors.response);
  }

  const request = http.interceptors.request.use((config) => {
    const token = tokens.getAccessToken();
    if (token) config.headers.set("Authorization", `Bearer ${token}`);
    return config;
  });

  // Single flight: concurrent 401s share one refresh. Each refresh rotates the
  // token, so parallel refreshes would revoke each other and sign the user out.
  let inFlight: Promise<string> | null = null;

  function refresh(): Promise<string> {
    inFlight ??= (async () => {
      try {
        const refreshToken = await tokens.getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token");
        const { data } = await http.post<TokenPair>(REFRESH_PATH, { refreshToken });
        await tokens.setTokens(data);
        return data.accessToken;
      } catch (error) {
        try {
          await tokens.clear();
        } finally {
          onAuthFailure();
        }
        throw error;
      }
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  const response = http.interceptors.response.use(
    undefined,
    async (error: AxiosError) => {
      const config = error.config as
        (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
      if (
        error.response?.status !== 401 ||
        !config ||
        config._retried ||
        config.url?.includes(REFRESH_PATH)
      ) {
        throw error;
      }
      config._retried = true;
      config.headers.set("Authorization", `Bearer ${await refresh()}`);
      return http.request(config);
    },
  );

  interceptors = { request, response };
}
