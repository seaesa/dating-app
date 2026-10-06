import { Redirect, Stack } from "expo-router";
import * as React from "react";

import { useAuthStore } from "@repo/store";

import { useLocationRefresh } from "@/use-location-refresh";

export default function AppLayout() {
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const onboardingPending = useAuthStore((s) => s.onboardingPending);
  useLocationRefresh();

  if (!refreshToken) return <Redirect href="/(auth)/welcome" />;
  if (onboardingPending) return <Redirect href="/(onboarding)" />;

  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="(tabs)">
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="verify" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen
        name="edit-profile"
        options={{
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}
