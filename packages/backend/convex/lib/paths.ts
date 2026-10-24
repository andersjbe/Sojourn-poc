// Pure helpers shared by the backend and the apps (no Convex imports).

export type LatLng = { lat: number; lng: number };

export type PathEntry = {
  authorId: string;
  recordedAt: number;
  location: LatLng | null;
};

export type AuthorPath = { authorId: string; coords: LatLng[] };

/**
 * One straight-segment line per author, in time order. Entries whose location
 * is hidden (still within the safety delay) are skipped.
 */
export function buildAuthorPaths(entries: PathEntry[]): AuthorPath[] {
  const byAuthor = new Map<string, PathEntry[]>();
  for (const entry of entries) {
    if (!entry.location) continue;
    const list = byAuthor.get(entry.authorId) ?? [];
    list.push(entry);
    byAuthor.set(entry.authorId, list);
  }
  return [...byAuthor.entries()].map(([authorId, list]) => ({
    authorId,
    coords: list
      .sort((a, b) => a.recordedAt - b.recordedAt)
      .map((e) => e.location as LatLng),
  }));
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

/** Earth-tone line colors, one per author. */
export const PATH_COLORS = ["#A4532B", "#2F4A3A", "#6B4F3A", "#5B7553", "#C28E3A", "#4E6E7A"];
