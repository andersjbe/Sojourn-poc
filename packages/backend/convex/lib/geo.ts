import { GeospatialIndex } from "@convex-dev/geospatial";

import { components, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Only entries whose location is visible to non-members are indexed, so area
 * queries can never reveal a location that is still inside the safety delay.
 */
export const entryLocations = new GeospatialIndex<
  Id<"entries">,
  { journeyId: string; visibility: Doc<"journeys">["visibility"] }
>(components.geospatial);

export function locationReleaseAt(entry: Doc<"entries">, journey: Doc<"journeys">) {
  return entry.recordedAt + journey.locationDelayHours * 60 * 60 * 1000;
}

/**
 * Recompute whether an entry's location is public, keep the geospatial index
 * in step, and schedule the release if it's still in the future.
 */
export async function syncLocationRelease(
  ctx: MutationCtx,
  entry: Doc<"entries">,
  journey: Doc<"journeys">,
) {
  const releaseAt = locationReleaseAt(entry, journey);
  const isPublic = entry.shareLocationNow || Date.now() >= releaseAt;
  if (isPublic !== entry.locationPublic) {
    await ctx.db.patch(entry._id, { locationPublic: isPublic });
  }
  if (isPublic) {
    await indexEntry(ctx, entry, journey);
  } else {
    await entryLocations.remove(ctx, entry._id);
    // Earlier-scheduled releases re-check the time and no-op if not yet due.
    await ctx.scheduler.runAt(releaseAt, internal.entries.releaseLocation, { entryId: entry._id });
  }
}

export async function indexEntry(ctx: MutationCtx, entry: Doc<"entries">, journey: Doc<"journeys">) {
  await entryLocations.insert(
    ctx,
    entry._id,
    { latitude: entry.location.lat, longitude: entry.location.lng },
    { journeyId: journey._id, visibility: journey.visibility },
    entry.recordedAt,
  );
}
