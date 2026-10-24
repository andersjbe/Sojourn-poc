import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { getProfile, profileSummary } from "./access";
import { releaseAt } from "./geo";

/**
 * Non-members can't see an entry at all until it's published (the journey's
 * delay has passed, or the author chose to publish immediately).
 */
export function canSeeEntry(entry: Doc<"entries">, isMember: boolean) {
  return isMember || entry.published;
}

/** Shape sent to clients. Callers must check `canSeeEntry` first. */
export async function toEntryView(
  ctx: QueryCtx,
  entry: Doc<"entries">,
  journey: Doc<"journeys">,
  isMember: boolean,
) {
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
    location: entry.location,
    publishNow: entry.publishNow,
    /** Members only: whether the public can see this entry yet, and when they will. */
    releaseStatus: isMember
      ? { isPublic: entry.published, releaseAt: releaseAt(entry, journey) }
      : null,
  };
}
