import type { LatLng } from "@sojourn/backend/convex/lib/paths";

export function getCurrentLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Location isn't available in this browser."));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message || "Couldn't get your location.")),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  });
}
