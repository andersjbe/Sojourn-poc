import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { getProfile, profileSummary } from "./access";
import { locationReleaseAt } from "./geo";

/** Shape sent to clients; hides the location from non-members during the delay. */
export async function toEntryView(
  ctx: QueryCtx,
  entry: Doc<"entries">,
  journey: Doc<"journeys">,
  isMember: boolean,
) {
  const showLocation = isMember || entry.locationPublic;
  const photos = [];
  for (const id of entry.photoIds) {
    const url = await ctx.storage.getUrl(id);
    if (url) photos.push({ id, url });
  }
  return {
    _id: entry._id,
    journeyId: entry.journeyId,
    clientId: entry.clientId,
    recordedAt: entry.recordedAt,
    body: entry.body ?? null,
    photos,
    author: profileSummary(await getProfile(ctx, entry.authorId)),
    authorId: entry.authorId,
    location: showLocation ? entry.location : null,
    shareLocationNow: entry.shareLocationNow,
    /** Members only: whether non-members can see this location yet, and when they will. */
    locationStatus: isMember
      ? { isPublic: entry.locationPublic, releaseAt: locationReleaseAt(entry, journey) }
      : null,
  };
}
