import { QueryClient } from "@tanstack/react-query";

/**
 * The shortest media presign lifetime on the API (`S3_PRESIGN_TTL`), which
 * governs the private photo tier. Public avatars get 24h, so this is the bound
 * that matters once a reveal flow renders private photos.
 */
export const PRESIGN_TTL_MS = 5 * 60 * 1000;

/**
 * Cached data is rendered immediately on mount regardless of staleness, so what
 * bounds the age of a URL on screen is gcTime, not staleTime. Kept well under
 * the presign lifetime rather than equal to it: an entry served at 299s would
 * have a URL about to expire before the image request even leaves the device.
 */
export const GC_TIME_MS = Math.floor(PRESIGN_TTL_MS / 2);

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: GC_TIME_MS,
        retry: (failureCount, error) => {
          const status = (error as { response?: { status?: number } })?.response?.status;
          // Retrying a 4xx repeats a request the server already refused.
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}
