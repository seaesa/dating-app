import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * Requests push notification permissions when available.
 *
 * Skipped inside Expo Go: SDK 53+ removed remote push notifications
 * from the Expo Go client on Android, and evaluating expo-notifications
 * there throws an uncaught error at module evaluation time.
 */
export async function askForNotifications(): Promise<void> {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return;
  }
  try {
    const Notifications = await import("expo-notifications");
    await Notifications.requestPermissionsAsync().catch(() => undefined);
  } catch {
    // Permission request unavailable or rejected.
  }
}
