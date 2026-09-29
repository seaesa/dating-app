import { Redirect } from "expo-router";

import { useAuthStore } from "@repo/store";

export default function Index() {
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const onboardingPending = useAuthStore((s) => s.onboardingPending);

  // The root only routes. Every target guards itself, so this cannot strand a
  // user in the wrong stack if the store changes underneath it.
  if (!refreshToken) return <Redirect href="/(auth)/phone" />;
  return (
    <Redirect href={onboardingPending ? "/(onboarding)/profile" : "/(app)/profile"} />
  );
}
