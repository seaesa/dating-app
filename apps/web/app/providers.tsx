"use client";

import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { configureApiClient, createQueryClient } from "@repo/api-contract";

import { useAdminAuthStore } from "../src/stores/admin-auth";

const queryClient = createQueryClient();

/** Set by the provider once the router exists. */
let redirectToLogin: () => void = () => undefined;

configureApiClient({
  tokens: {
    getAccessToken: () => useAdminAuthStore.getState().adminToken,
    getRefreshToken: async () => null,
    setTokens: async () => undefined,
    clear: async () => {
      useAdminAuthStore.getState().logout();
    },
  },
  onAuthFailure: () => {
    queryClient.clear();
    useAdminAuthStore.getState().logout();
    redirectToLogin();
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrate = useAdminAuthStore((s) => s.hydrate);

  React.useEffect(() => {
    redirectToLogin = () => router.replace("/login");
    hydrate();
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
