import type { LatLng } from "@sojourn/backend/convex/lib/paths";
import * as Location from "expo-location";

/** Current GPS position; works without signal. */
export async function getCurrentLocation(): Promise<LatLng> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Location permission is needed to tag entries.");
  const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
  const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }));
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}
