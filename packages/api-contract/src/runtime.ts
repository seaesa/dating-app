import type { CreateClientConfig } from "./generated/client.gen";

/**
 * Base URL resolution.
 *
 * Next and Expo expose public variables under different prefixes, and both
 * inline them at build time, so each must be read as a literal property access
 * rather than through a computed key.
 */
function resolveApiBaseUrl(): string {
  const fromExpo = process.env.EXPO_PUBLIC_API_URL;
  const fromNext = process.env.NEXT_PUBLIC_API_URL;
  return fromExpo || fromNext || "http://localhost:8000";
}

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseURL: resolveApiBaseUrl(),
});
