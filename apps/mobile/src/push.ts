import Constants, { ExecutionEnvironment } from "expo-constants";
import { router } from "expo-router";
import * as React from "react";
import { Platform } from "react-native";

import { registerPushDevice, unregisterPushDevice } from "@repo/api-contract";
import { useAuthStore } from "@repo/store";

import { getActiveConnection } from "@/chat/active-connection";

let registeredToken: string | null = null;

/** Same guard as notification-access.ts: expo-notifications throws in Expo Go. */
async function loadNotifications() {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    return await import("expo-notifications");
  } catch {
    return null;
  }
}

/** Registers only if permission was already granted (onboarding asks for it). */
// Each early return explains itself in development; in production a device
// without push simply has none.
const skip = (reason: string) => {
  if (__DEV__) console.warn(`[push] not registered: ${reason}`);
};

async function registerPushToken(): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return skip("expo-notifications unavailable (Expo Go?)");
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return skip(`permission is ${status}`);
  const projectId: string | undefined =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  // Needs `eas init`; a local build without a project id has no push token.
  if (!projectId) return skip("no EAS projectId (run eas init)");
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await registerPushDevice({
    token,
    platform: Platform.OS === "ios" ? "ios" : "android",
  });
  registeredToken = token;
}

/** Called before sign-out revokes the session, while requests still authenticate. */
export async function unregisterPushToken(): Promise<void> {
  const token = registeredToken;
  if (!token) return;
  registeredToken = null;
  await unregisterPushDevice(token);
}

export function usePushNotifications(): void {
  // Signed in or not, not the token itself: the refresh token rotates on the
  // first API call after a cold start, which would register a second time.
  const signedIn = useAuthStore((s) => s.refreshToken !== null);

  React.useEffect(() => {
    if (signedIn) {
      void registerPushToken().catch((error: unknown) => skip(String(error)));
    }
  }, [signedIn]);

  React.useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void loadNotifications().then((Notifications) => {
      if (!Notifications || cancelled) return;
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const id = notification.request.content.data?.connectionId;
          const here = typeof id === "string" && id === getActiveConnection();
          return {
            shouldShowBanner: !here,
            shouldShowList: !here,
            shouldPlaySound: !here,
            shouldSetBadge: false,
          };
        },
      });
      const subscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const id = response.notification.request.content.data?.connectionId;
          if (typeof id === "string") {
            router.push({
              pathname: "/(app)/chat/[connectionId]",
              params: { connectionId: id },
            });
          }
        },
      );
      cleanup = () => subscription.remove();
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);
}
