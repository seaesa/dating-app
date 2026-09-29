"use client";

import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { configureApiClient, createQueryClient, logout } from "@repo/api-contract";
import {
  createTokenProvider,
  onSessionChange,
  registerSessionRevoke,
  useAuthStore,
} from "@repo/store";

// Module scope, not an effect. Child effects run before parent effects, so a
// page could issue its first request before the interceptors existed; and the
// deps of an effect that captures `router` re-run it, which used to stack a
// second set of interceptors holding a stale callback.
const queryClient = createQueryClient();

/** Set by the provider once the router exists. */
let redirectToLogin: () => void = () => undefined;

configureApiClient({
  tokens: createTokenProvider(),
  onAuthFailure: () => {
    // The refresh failed and is not retryable, so the cache holds data for a
    // session that no longer exists.
    queryClient.clear();
    redirectToLogin();
  },
});

// The query cache is keyed by endpoint, not by user — getMe's key carries no
// identity. On a shared browser, user B would otherwise be served user A's
// cached profile, real name included.
onSessionChange(() => queryClient.clear());

// So a deliberate sign-out revokes the jti instead of leaving it redeemable for
// the rest of its lifetime. Best effort: the store ignores a failure here.
registerSessionRevoke((refreshToken) => logout({ body: { refreshToken } }));

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);

  React.useEffect(() => {
    redirectToLogin = () => router.replace("/login");
    void hydrate();
  }, [router, hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        {children}
        <PortalHost />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
