import * as Location from "expo-location";

import { updateMyIdentity, updateMyProfile } from "@repo/api-contract";
import type { UserRead } from "@repo/api-contract";

import type { locate } from "@/locate";

/** Stores where the device is now, and fills the city if the profile has none. */
export async function saveCurrentLocation(
  me: UserRead,
  here: Awaited<ReturnType<typeof locate>>,
): Promise<UserRead> {
  let updated = await updateMyIdentity({ location: here.point });
  if (here.city && !me.profile.city) updated = await updateMyProfile({ city: here.city });
  return updated;
}

/** Shows the system dialog when it can still be shown; never a screen of its own. */
export async function askForLocation(): Promise<void> {
  // A failure only means no dialog; the app works on without a location.
  await Location.requestForegroundPermissionsAsync().catch(() => undefined);
}
