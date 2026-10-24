import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

/** The signed-in user's Better Auth id, or null. */
export async function getViewerId(ctx: Ctx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

export async function requireViewerId(ctx: Ctx): Promise<string> {
  const viewerId = await getViewerId(ctx);
  if (!viewerId) throw new ConvexError("You need to be signed in.");
  return viewerId;
}

export async function getProfile(ctx: Ctx, userId: string) {
  return await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

export async function getMembership(ctx: Ctx, journeyId: Id<"journeys">, userId: string) {
  return await ctx.db
    .query("journeyMembers")
    .withIndex("by_journey_user", (q) => q.eq("journeyId", journeyId).eq("userId", userId))
    .unique();
}

export async function isFollowing(ctx: Ctx, followerId: string, followeeId: string) {
  const follow = await ctx.db
    .query("follows")
    .withIndex("by_pair", (q) => q.eq("followerId", followerId).eq("followeeId", followeeId))
    .unique();
  return follow?.status === "accepted";
}

export type JourneyAccess = {
  canView: boolean;
  /** Active owner/author: sees exact locations immediately and can post. */
  isMember: boolean;
  role: "owner" | "author" | null;
};

export async function getJourneyAccess(
  ctx: Ctx,
  journey: Doc<"journeys">,
  viewerId: string | null,
): Promise<JourneyAccess> {
  if (viewerId) {
    const membership = await getMembership(ctx, journey._id, viewerId);
    if (membership?.status === "active") {
      return { canView: true, isMember: true, role: membership.role };
    }
  }
  let canView = false;
  switch (journey.visibility) {
    case "public":
    case "unlisted":
      canView = true;
      break;
    case "followers":
      canView = viewerId !== null && (await isFollowing(ctx, viewerId, journey.ownerId));
      break;
    case "private":
      canView = false;
      break;
  }
  return { canView, isMember: false, role: null };
}

/** Listed in explore / tag browsing. */
export async function isDiscoverable(ctx: Ctx, journey: Doc<"journeys">) {
  if (journey.visibility !== "public") return false;
  const owner = await getProfile(ctx, journey.ownerId);
  return owner?.profileVisibility !== "private";
}

export async function requireJourneyRole(
  ctx: Ctx,
  journeyId: Id<"journeys">,
  roles: Array<"owner" | "author">,
) {
  const viewerId = await requireViewerId(ctx);
  const journey = await ctx.db.get(journeyId);
  if (!journey) throw new ConvexError("Journey not found.");
  const membership = await getMembership(ctx, journeyId, viewerId);
  if (membership?.status !== "active" || !roles.includes(membership.role)) {
    throw new ConvexError("You don't have permission to do that on this journey.");
  }
  return { viewerId, journey, membership };
}

export function profileSummary(profile: Doc<"profiles"> | null) {
  return profile
    ? {
        userId: profile.userId,
        username: profile.username,
        displayName: profile.displayName,
        trailName: profile.trailName ?? null,
      }
    : null;
}
