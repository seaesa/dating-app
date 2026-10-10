import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider } from "@tanstack/react-query";
import { router } from "expo-router";
import * as React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { configureApiClient, createQueryClient, logout } from "@repo/api-contract";
import {
  createTokenProvider,
  onSessionChange,
  registerSessionRevoke,
  useAuthStore,
} from "@repo/store";

import { unregisterPushToken } from "@/push";

const queryClient = createQueryClient();

configureApiClient({
  tokens: createTokenProvider(),
  onAuthFailure: () => {
    // The refresh failed and is not retryable, so the cache holds data for a
    // session that no longer exists.
    queryClient.clear();
    setTimeout(() => {
      try {
        router.replace("/(auth)/phone");
      } catch {
        // Ignored: Declarative redirect in RootNavigator handles unauthenticated state
      }
    }, 100);
  },
});

// The query cache is keyed by endpoint, not by user — meQuery's key carries no
// identity. Two accounts on one device would otherwise see each other's cached
// profile, real name included.
onSessionChange(() => queryClient.clear());

// So a deliberate sign-out revokes the jti instead of leaving it redeemable for
// the rest of its lifetime. Best effort: the store ignores a failure here.
registerSessionRevoke(async (refreshToken) => {
  // Before revoking: the DELETE still needs a live session.
  await unregisterPushToken().catch(() => undefined);
  return logout(refreshToken);
});

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);

  React.useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        {children}
        {/* Required by dialogs and menus: React Native has no DOM portals. */}
        <PortalHost />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
