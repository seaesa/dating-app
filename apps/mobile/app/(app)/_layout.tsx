import { Redirect, Stack } from "expo-router";
import * as React from "react";

import { useAuthStore } from "@repo/store";

export default function AppLayout() {
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const onboardingPending = useAuthStore((s) => s.onboardingPending);

  if (!refreshToken) return <Redirect href="/(auth)/phone" />;
  if (onboardingPending) return <Redirect href="/(onboarding)/profile" />;

  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="(tabs)">
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="edit-profile"
        options={{
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}
