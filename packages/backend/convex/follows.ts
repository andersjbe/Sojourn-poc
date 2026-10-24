import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { getProfile, getViewerId, profileSummary, requireViewerId } from "./lib/access";

/** Follow a hiker; becomes a request if their profile requires approval. */
export const follow = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const viewerId = await requireViewerId(ctx);
    if (userId === viewerId) throw new ConvexError("You can't follow yourself.");
    const target = await getProfile(ctx, userId);
    if (!target) throw new ConvexError("Hiker not found.");
    if (target.profileVisibility === "private") {
      throw new ConvexError("This hiker isn't accepting followers.");
    }
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) => q.eq("followerId", viewerId).eq("followeeId", userId))
      .unique();
    if (existing) return existing.status;
    const status = target.profileVisibility === "public" ? "accepted" : "pending";
    await ctx.db.insert("follows", { followerId: viewerId, followeeId: userId, status });
    return status;
  },
});

/** Unfollow, or cancel a pending request. */
export const unfollow = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const viewerId = await requireViewerId(ctx);
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) => q.eq("followerId", viewerId).eq("followeeId", userId))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

/** Approve/decline a follow request, or remove an existing follower (accept=false). */
export const respond = mutation({
  args: { followerId: v.string(), accept: v.boolean() },
  handler: async (ctx, { followerId, accept }) => {
    const viewerId = await requireViewerId(ctx);
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) => q.eq("followerId", followerId).eq("followeeId", viewerId))
      .unique();
    if (!existing) return;
    if (accept) await ctx.db.patch(existing._id, { status: "accepted" });
    else await ctx.db.delete(existing._id);
  },
});

export const requests = query({
  args: {},
  handler: async (ctx) => {
    const viewerId = await getViewerId(ctx);
    if (!viewerId) return [];
    const pending = await ctx.db
      .query("follows")
      .withIndex("by_followee", (q) => q.eq("followeeId", viewerId).eq("status", "pending"))
      .collect();
    const out = [];
    for (const f of pending) {
      const profile = profileSummary(await getProfile(ctx, f.followerId));
      if (profile) out.push(profile);
    }
    return out;
  },
});
