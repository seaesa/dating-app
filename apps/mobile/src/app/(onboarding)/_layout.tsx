import { Redirect, Stack } from "expo-router";

import { useAuthStore } from "@repo/store";

export default function OnboardingLayout() {
  const refreshToken = useAuthStore((s) => s.refreshToken);

  if (!refreshToken) return <Redirect href="/(auth)/welcome" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
