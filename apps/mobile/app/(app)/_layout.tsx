import { Redirect, Stack } from "expo-router";

import { useAuthStore } from "@repo/store";

export default function AppLayout() {
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const onboardingPending = useAuthStore((s) => s.onboardingPending);

  if (!refreshToken) return <Redirect href="/(auth)/phone" />;
  // Backgrounded or killed on the onboarding form: the profile screen would
  // render nickname "" and age 0 with no route back to the form.
  if (onboardingPending) return <Redirect href="/(onboarding)/profile" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
