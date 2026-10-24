// Pure helpers shared by the backend and the apps (no Convex imports).

export type LatLng = { lat: number; lng: number };

export type PathEntry = {
  authorId: string;
  recordedAt: number;
  location: LatLng | null;
};

/**
 * The journey's line: every located entry, from all authors, joined with
 * straight segments in time order.
 */
export function buildPath(entries: PathEntry[]): LatLng[] {
  return entries
    .filter((e): e is PathEntry & { location: LatLng } => e.location !== null)
    .sort((a, b) => a.recordedAt - b.recordedAt)
    .map((e) => e.location);
}

/** [west, south, east, north] covering every point, or null if there are none. */
export function boundsOf(points: LatLng[]): [number, number, number, number] | null {
  if (points.length === 0) return null;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const { lat, lng } of points) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return [west, south, east, north];
}

/** Earth-tone marker colors, one per author. */
export const PATH_COLORS = ["#A4532B", "#2F4A3A", "#6B4F3A", "#5B7553", "#C28E3A", "#4E6E7A"];
