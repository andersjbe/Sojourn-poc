import { ConvexError, v } from "convex/values";

import { mutation } from "./_generated/server";
import { getMembership, requireJourneyRole, requireViewerId } from "./lib/access";

/** Owner invites another hiker (by username) to post on the journey. */
export const invite = mutation({
  args: { journeyId: v.id("journeys"), username: v.string() },
  handler: async (ctx, { journeyId, username }) => {
    const { viewerId } = await requireJourneyRole(ctx, journeyId, ["owner"]);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", username.trim().toLowerCase().replace(/^@/, "")))
      .unique();
    if (!profile) throw new ConvexError("No hiker with that username.");
    if (await getMembership(ctx, journeyId, profile.userId)) {
      throw new ConvexError("They're already on this journey (or invited).");
    }
    await ctx.db.insert("journeyMembers", {
      journeyId,
      userId: profile.userId,
      role: "author",
      status: "invited",
      invitedBy: viewerId,
    });
  },
});

export const respond = mutation({
  args: { journeyId: v.id("journeys"), accept: v.boolean() },
  handler: async (ctx, { journeyId, accept }) => {
    const viewerId = await requireViewerId(ctx);
    const membership = await getMembership(ctx, journeyId, viewerId);
    if (membership?.status !== "invited") throw new ConvexError("No pending invite.");
    if (accept) await ctx.db.patch(membership._id, { status: "active" });
    else await ctx.db.delete(membership._id);
  },
});

/**
 * Owner removes an author (or cancels an invite), or an author leaves.
 * Their entries stay in the journey.
 */
export const remove = mutation({
  args: { journeyId: v.id("journeys"), userId: v.string() },
  handler: async (ctx, { journeyId, userId }) => {
    const viewerId = await requireViewerId(ctx);
    const journey = await ctx.db.get(journeyId);
    if (!journey) throw new ConvexError("Journey not found.");
    if (userId === journey.ownerId) throw new ConvexError("The owner can't be removed.");
    if (viewerId !== userId && viewerId !== journey.ownerId) {
      throw new ConvexError("Only the owner can remove authors.");
    }
    const membership = await getMembership(ctx, journeyId, userId);
    if (membership) await ctx.db.delete(membership._id);
  },
});
