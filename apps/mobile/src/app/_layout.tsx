import "../../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useAuthStore } from "@repo/store";

import { Providers } from "@/providers";

function RootNavigator() {
  const hydrated = useAuthStore((s) => s.hydrated);

  // Render nothing until storage has been read. Routing on an unhydrated store
  // sends a signed-in user to the login screen on every cold start.
  if (!hydrated) return null;

  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <Providers>
      <StatusBar style="auto" />
      <RootNavigator />
    </Providers>
  );
}
