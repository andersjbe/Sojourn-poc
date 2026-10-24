import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { getJourneyAccess, getProfile, getViewerId, requireViewerId } from "./lib/access";
import { profileVisibility } from "./schema";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

/** The signed-in user and their profile (null profile means onboarding is needed). */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const viewerId = await getViewerId(ctx);
    if (!viewerId) return null;
    return { userId: viewerId, profile: await getProfile(ctx, viewerId) };
  },
});

export const create = mutation({
  args: { username: v.string(), displayName: v.string(), trailName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const viewerId = await requireViewerId(ctx);
    if (await getProfile(ctx, viewerId)) throw new ConvexError("Profile already exists.");
    const username = args.username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(username)) {
      throw new ConvexError("Usernames are 3–20 characters: letters, numbers, underscores.");
    }
    const taken = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (taken) throw new ConvexError("That username is taken.");
    const displayName = args.displayName.trim();
    if (!displayName) throw new ConvexError("Display name is required.");
    return await ctx.db.insert("profiles", {
      userId: viewerId,
      username,
      displayName,
      trailName: args.trailName?.trim() || undefined,
      profileVisibility: "public",
    });
  },
});

export const update = mutation({
  args: {
    displayName: v.optional(v.string()),
    trailName: v.optional(v.string()),
    bio: v.optional(v.string()),
    profileVisibility: v.optional(profileVisibility),
  },
  handler: async (ctx, args) => {
    const viewerId = await requireViewerId(ctx);
    const profile = await getProfile(ctx, viewerId);
    if (!profile) throw new ConvexError("Create a profile first.");
    const displayName = args.displayName?.trim();
    if (args.displayName !== undefined && !displayName) {
      throw new ConvexError("Display name is required.");
    }
    await ctx.db.patch(profile._id, {
      ...(displayName ? { displayName } : {}),
      ...(args.trailName !== undefined ? { trailName: args.trailName.trim() || undefined } : {}),
      ...(args.bio !== undefined ? { bio: args.bio.trim() || undefined } : {}),
      ...(args.profileVisibility ? { profileVisibility: args.profileVisibility } : {}),
    });

    if (args.profileVisibility && args.profileVisibility !== profile.profileVisibility) {
      const incoming = await ctx.db
        .query("follows")
        .withIndex("by_followee", (q) => q.eq("followeeId", viewerId))
        .collect();
      for (const follow of incoming) {
        if (args.profileVisibility === "private") {
          await ctx.db.delete(follow._id); // private profiles have no followers
        } else if (args.profileVisibility === "public" && follow.status === "pending") {
          await ctx.db.patch(follow._id, { status: "accepted" });
        }
      }
    }
  },
});

/** Public profile page: profile, follow state, and the journeys the viewer may see. */
export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const viewerId = await getViewerId(ctx);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", args.username.toLowerCase()))
      .unique();
    if (!profile) return null;

    const isSelf = viewerId === profile.userId;
    const follow = viewerId
      ? await ctx.db
          .query("follows")
          .withIndex("by_pair", (q) => q.eq("followerId", viewerId).eq("followeeId", profile.userId))
          .unique()
      : null;
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_followee", (q) => q.eq("followeeId", profile.userId).eq("status", "accepted"))
      .collect();
    const following = (
      await ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerId", profile.userId))
        .collect()
    ).filter((f) => f.status === "accepted");

    const memberships = await ctx.db
      .query("journeyMembers")
      .withIndex("by_user", (q) => q.eq("userId", profile.userId))
      .collect();
    const journeys = [];
    for (const membership of memberships) {
      if (membership.status !== "active") continue;
      const journey = await ctx.db.get(membership.journeyId);
      if (!journey) continue;
      const access = await getJourneyAccess(ctx, journey, viewerId);
      // Unlisted journeys are reachable by link but not listed on profiles.
      const listed = access.isMember || (access.canView && journey.visibility !== "unlisted");
      if (listed) journeys.push({ ...journey, role: membership.role });
    }
    journeys.sort((a, b) => b._creationTime - a._creationTime);

    return {
      profile: {
        userId: profile.userId,
        username: profile.username,
        displayName: profile.displayName,
        trailName: profile.trailName ?? null,
        bio: profile.bio ?? null,
        profileVisibility: profile.profileVisibility,
      },
      isSelf,
      followStatus: follow?.status ?? null,
      followerCount: followers.length,
      followingCount: following.length,
      journeys,
    };
  },
});

/** Username prefix search (excludes private profiles). */
export const search = query({
  args: { q: v.string() },
  handler: async (ctx, args) => {
    const prefix = args.q.trim().toLowerCase().replace(/^@/, "");
    if (!prefix) return [];
    const matches = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.gte("username", prefix).lt("username", `${prefix}￿`))
      .take(20);
    return matches
      .filter((p) => p.profileVisibility !== "private")
      .map((p) => ({
        userId: p.userId,
        username: p.username,
        displayName: p.displayName,
        trailName: p.trailName ?? null,
      }));
  },
});
