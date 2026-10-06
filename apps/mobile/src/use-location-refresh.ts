import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import * as React from "react";
import { AppState } from "react-native";

import { meQuery } from "@repo/api-contract";
import type { GeoPoint, UserRead } from "@repo/api-contract";

import { locate } from "@/locate";
import { saveCurrentLocation } from "@/location-access";

const MIN_INTERVAL_MS = 30 * 60 * 1000;
const MIN_MOVE_KM = 1;

/** Great-circle distance between two GeoJSON points, in km. */
function distanceKm(a: GeoPoint, b: GeoPoint) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const [lon1, lat1] = a.coordinates as [number, number];
  const [lon2, lat2] = b.coordinates as [number, number];
  const h =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/**
 * Keeps the stored location current while the app is used, so distances stay
 * right after the user moves. Never prompts: only runs once permission exists.
 */
export function useLocationRefresh() {
  const queryClient = useQueryClient();
  const me = useQuery(meQuery()).data;
  const meRef = React.useRef<UserRead | undefined>(me);
  meRef.current = me;

  React.useEffect(() => {
    let lastRun = 0;

    async function refresh() {
      const current = meRef.current;
      if (!current || Date.now() - lastRun < MIN_INTERVAL_MS) return;
      lastRun = Date.now();
      try {
        const { granted } = await Location.getForegroundPermissionsAsync();
        if (!granted) return;
        const here = await locate();
        const previous = current.account?.location;
        const moved = !previous || distanceKm(previous, here.point) >= MIN_MOVE_KM;
        // Also runs when the city is still unknown, e.g. the geocoder failed before.
        if (!moved && current.profile.city) return;
        queryClient.setQueryData(
          meQuery().queryKey,
          await saveCurrentLocation(current, here),
        );
      } catch {
        // Try again on the next foreground.
        lastRun = 0;
      }
    }

    void refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => subscription.remove();
  }, [queryClient, Boolean(me)]);
}
