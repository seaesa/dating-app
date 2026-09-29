import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";

import { zTokenPair } from "./generated/zod.gen";
import type { TokenProvider } from "./tokens";

export type { TokenProvider, TokenPairValue } from "./tokens";

/**
 * Pinned against the generated SDK by a test, because a rename in openapi.json
 * would regenerate every other call site consistently and leave this literal as
 * the only stale one — passing typecheck and the generation gate while breaking
 * every token refresh at runtime.
 */
export const REFRESH_PATH = "/v1/auth/refresh";

interface RetriedConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

export interface InterceptorOptions {
  tokens: TokenProvider;
  /** Called once when the session is unrecoverable, so the app can route to login. */
  onAuthFailure: () => void;
}

/**
 * Interceptor ids per client, so re-attaching replaces rather than stacks.
 *
 * React Strict Mode runs effects twice, and the web app configures the client
 * from an effect. Stacked handlers leave the first attach's callbacks in front of
 * the newest ones and give each attach its own `inFlight`, which quietly undoes
 * the single-flight guarantee below.
 */
const attached = new WeakMap<AxiosInstance, { request: number; response: number }>();

export function attachInterceptors(
  client: AxiosInstance,
  { tokens, onAuthFailure }: InterceptorOptions,
): void {
  const previous = attached.get(client);
  if (previous) {
    client.interceptors.request.eject(previous.request);
    client.interceptors.response.eject(previous.response);
  }

  const request = client.interceptors.request.use((config) => {
    const token = tokens.getAccessToken();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  });

  // Single-flight: the first 401 starts a refresh, every other 401 awaits the
  // same promise. Without this, ten concurrent 401s start ten refreshes; each
  // rotation revokes the previous token, so nine fail and the user is signed
  // out mid-session.
  let inFlight: Promise<string> | null = null;

  async function refreshOnce(): Promise<string> {
    if (inFlight) return inFlight;

    inFlight = (async () => {
      try {
        const refreshToken = await tokens.getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token");

        const response = await client.post(REFRESH_PATH, { refreshToken });
        // Parsed, not cast: a cast turns a renamed field into
        // `accessToken: undefined` and every later request goes out
        // unauthenticated with nothing in the logs to say why.
        const pair = zTokenPair.parse(response.data);
        await tokens.setTokens({
          accessToken: pair.accessToken,
          refreshToken: pair.refreshToken,
        });
        return pair.accessToken;
      } catch (error) {
        // Teardown belongs to the flight, so it runs once per dead session
        // rather than once per waiting caller. Ten concurrent 401s used to mean
        // ten cache clears and ten redirects.
        try {
          await tokens.clear();
        } finally {
          // A locked keychain must not stop the app routing to login; without
          // this the user sits on a session that can never recover.
          onAuthFailure();
        }
        throw error;
      }
    })();

    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  }

  const response = client.interceptors.response.use(
    (res) => res,
    async (error: unknown) => {
      const err = error as {
        response?: { status?: number };
        config?: RetriedConfig;
      };
      const status = err.response?.status;
      const config = err.config;

      // A 401 from the refresh endpoint itself must not recurse.
      const isRefreshCall = config?.url?.includes(REFRESH_PATH) ?? false;
      if (status !== 401 || !config || config._retried || isRefreshCall) {
        throw error;
      }

      config._retried = true;
      const accessToken = await refreshOnce();
      config.headers.set("Authorization", `Bearer ${accessToken}`);
      return await client.request(config);
    },
  );

  attached.set(client, { request, response });
}
