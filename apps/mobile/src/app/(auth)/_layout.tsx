import { Redirect, Stack } from "expo-router";

import { useAuthStore } from "@repo/store";

export default function AuthLayout() {
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const onboardingPending = useAuthStore((s) => s.onboardingPending);

  // A signed-in user has no business in the auth stack — but a user who never
  // finished registering belongs in onboarding, not on a profile of empty
  // strings. Both targets read the same persisted flag, so this redirect cannot
  // race the one in otp.tsx.
  if (refreshToken) {
    return <Redirect href={onboardingPending ? "/(onboarding)" : "/(app)/(tabs)"} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="welcome">
      <Stack.Screen name="welcome" />
      <Stack.Screen name="phone" />
      <Stack.Screen name="otp" />
    </Stack>
  );
}
