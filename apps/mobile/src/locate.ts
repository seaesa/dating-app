import * as Location from "expo-location";

import type { GeoPoint } from "@repo/api-contract";
import { VIETNAM_CITIES } from "@repo/ui";

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\(.*\)|\b(thanh pho|tinh|tp\.?|city|province)\b/g, "")
    // "Hanoi" and "Hà Nội" must match, so spaces go too.
    .replace(/[^a-z]/g, "");

/** The catalog city an address falls in, if any. */
function matchCity(address: Location.LocationGeocodedAddress | undefined) {
  if (!address) return null;
  const names = [address.region, address.city, address.subregion]
    .filter((n): n is string => Boolean(n))
    .map(normalize);
  return VIETNAM_CITIES.find((city) => names.includes(normalize(city))) ?? null;
}

/** Where the device is now, and the catalog city when it can be told. */
export async function locate(): Promise<{ point: GeoPoint; city: string | null }> {
  const { coords } = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const [address] = await Location.reverseGeocodeAsync(coords).catch(() => []);
  return {
    // GeoJSON order: longitude first.
    point: { type: "Point", coordinates: [coords.longitude, coords.latitude] },
    city: matchCity(address),
  };
}
