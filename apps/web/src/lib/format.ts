import type { LatLng } from "@sojourn/backend/convex/lib/paths";

export function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatCoords({ lat, lng }: LatLng) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${ns} ${Math.abs(lng).toFixed(4)}°${ew}`;
}

/** Value for <input type="datetime-local"> in local time. */
export function toDateTimeLocal(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "data" in error && typeof error.data === "string") {
    return error.data; // ConvexError message
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}
