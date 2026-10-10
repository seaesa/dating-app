import { Redirect, Stack } from "expo-router";
import * as React from "react";

import { useAuthStore } from "@repo/store";

import { ChatEventBridge } from "@/components/chat/chat-event-bridge";
import { usePushNotifications } from "@/push";
import { RealtimeProvider } from "@/realtime/realtime-provider";
import { useLocationRefresh } from "@/use-location-refresh";

export default function AppLayout() {
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const onboardingPending = useAuthStore((s) => s.onboardingPending);
  useLocationRefresh();
  usePushNotifications();

  if (!refreshToken) return <Redirect href="/(auth)/welcome" />;
  if (onboardingPending) return <Redirect href="/(onboarding)" />;

  return (
    <RealtimeProvider>
      <ChatEventBridge />
      <Stack screenOptions={{ headerShown: false }} initialRouteName="(tabs)">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="verify" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen
          name="edit-profile"
          options={{
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="profile-detail"
          options={{
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="chat/[connectionId]/index"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="chat/[connectionId]/profile"
          options={{ animation: "slide_from_right" }}
        />
      </Stack>
    </RealtimeProvider>
  );
}
