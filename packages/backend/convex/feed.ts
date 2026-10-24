import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { type JourneyAccess, getJourneyAccess, getViewerId } from "./lib/access";
import { canSeeEntry, toEntryView } from "./lib/entryView";

const PER_HIKER = 20;

/**
 * Recent entries from hikers the viewer follows, newest first. Fan-out on read
 * is fine at proof-of-concept scale.
 */
export const get = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const viewerId = await getViewerId(ctx);
    if (!viewerId) return [];
    const limit = Math.min(args.limit ?? 50, 100);

    const following = (
      await ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerId", viewerId))
        .collect()
    ).filter((f) => f.status === "accepted");

    const candidates: Doc<"entries">[] = [];
    for (const f of following) {
      candidates.push(
        ...(await ctx.db
          .query("entries")
          .withIndex("by_author_time", (q) => q.eq("authorId", f.followeeId))
          .order("desc")
          .take(PER_HIKER)),
      );
    }
    candidates.sort((a, b) => b.recordedAt - a.recordedAt);

    const journeys = new Map<Id<"journeys">, { journey: Doc<"journeys">; access: JourneyAccess } | null>();
    const items = [];
    for (const entry of candidates) {
      if (items.length >= limit) break;
      if (!journeys.has(entry.journeyId)) {
        const journey = await ctx.db.get(entry.journeyId);
        journeys.set(
          entry.journeyId,
          journey ? { journey, access: await getJourneyAccess(ctx, journey, viewerId) } : null,
        );
      }
      const info = journeys.get(entry.journeyId);
      if (!info?.access.canView || !canSeeEntry(entry, info.access.isMember)) continue;
      items.push({
        ...(await toEntryView(ctx, entry, info.journey, info.access.isMember)),
        journeyTitle: info.journey.title,
      });
    }
    return items;
  },
});
