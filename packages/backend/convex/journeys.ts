import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import {
  getJourneyAccess,
  getProfile,
  getViewerId,
  isDiscoverable,
  profileSummary,
  requireJourneyRole,
  requireViewerId,
} from "./lib/access";
import { DEFAULT_LOCATION_DELAY_HOURS, MAX_LOCATION_DELAY_HOURS } from "./lib/constants";
import { entryLocations, syncLocationRelease } from "./lib/geo";
import { MAX_TAGS, cleanTag, normalizeTag } from "./lib/tags";
import { journeyStatus, journeyVisibility } from "./schema";

function validateTags(raw: string[]) {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const value of raw) {
    const tag = cleanTag(value);
    if (!tag) throw new ConvexError(`"${value}" isn't a valid tag.`);
    if (seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
  }
  if (tags.length > MAX_TAGS) throw new ConvexError(`Use at most ${MAX_TAGS} tags.`);
  return tags;
}

function validateDelay(hours: number) {
  if (!Number.isFinite(hours) || hours < 0 || hours > MAX_LOCATION_DELAY_HOURS) {
    throw new ConvexError(`Location delay must be between 0 and ${MAX_LOCATION_DELAY_HOURS} hours.`);
  }
  return hours;
}

async function writeTags(ctx: MutationCtx, journeyId: Id<"journeys">, tags: string[]) {
  const existing = await ctx.db
    .query("journeyTags")
    .withIndex("by_journey", (q) => q.eq("journeyId", journeyId))
    .collect();
  for (const row of existing) await ctx.db.delete(row._id);
  for (const tag of tags) await ctx.db.insert("journeyTags", { journeyId, tag: normalizeTag(tag) });
}

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
    status: v.optional(journeyStatus),
    visibility: v.optional(journeyVisibility),
    locationDelayHours: v.optional(v.number()),
    startedOn: v.optional(v.string()),
    endedOn: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewerId = await requireViewerId(ctx);
    if (!(await getProfile(ctx, viewerId))) throw new ConvexError("Create a profile first.");
    const title = args.title.trim();
    if (!title) throw new ConvexError("Give your journey a title.");
    const tags = validateTags(args.tags);
    const journeyId = await ctx.db.insert("journeys", {
      ownerId: viewerId,
      title,
      description: args.description?.trim() || undefined,
      tags,
      status: args.status ?? "active",
      visibility: args.visibility ?? "public",
      locationDelayHours: validateDelay(args.locationDelayHours ?? DEFAULT_LOCATION_DELAY_HOURS),
      startedOn: args.startedOn || undefined,
      endedOn: args.endedOn || undefined,
    });
    await ctx.db.insert("journeyMembers", {
      journeyId,
      userId: viewerId,
      role: "owner",
      status: "active",
      invitedBy: viewerId,
    });
    await writeTags(ctx, journeyId, tags);
    return journeyId;
  },
});

export const update = mutation({
  args: {
    journeyId: v.id("journeys"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    status: v.optional(journeyStatus),
    visibility: v.optional(journeyVisibility),
    locationDelayHours: v.optional(v.number()),
    startedOn: v.optional(v.string()),
    endedOn: v.optional(v.string()),
  },
  handler: async (ctx, { journeyId, ...args }) => {
    const { journey } = await requireJourneyRole(ctx, journeyId, ["owner"]);
    const title = args.title?.trim();
    if (args.title !== undefined && !title) throw new ConvexError("Give your journey a title.");
    const tags = args.tags ? validateTags(args.tags) : undefined;
    if (args.locationDelayHours !== undefined) validateDelay(args.locationDelayHours);

    await ctx.db.patch(journeyId, {
      ...(title ? { title } : {}),
      ...(args.description !== undefined ? { description: args.description.trim() || undefined } : {}),
      ...(tags ? { tags } : {}),
      ...(args.status ? { status: args.status } : {}),
      ...(args.visibility ? { visibility: args.visibility } : {}),
      ...(args.locationDelayHours !== undefined ? { locationDelayHours: args.locationDelayHours } : {}),
      ...(args.startedOn !== undefined ? { startedOn: args.startedOn || undefined } : {}),
      ...(args.endedOn !== undefined ? { endedOn: args.endedOn || undefined } : {}),
    });
    if (tags) await writeTags(ctx, journeyId, tags);

    const delayChanged =
      args.locationDelayHours !== undefined && args.locationDelayHours !== journey.locationDelayHours;
    const visibilityChanged = args.visibility !== undefined && args.visibility !== journey.visibility;
    if (delayChanged || visibilityChanged) {
      // Re-evaluate every entry's release time and refresh index filter keys.
      const updated = (await ctx.db.get(journeyId))!;
      const entries = await ctx.db
        .query("entries")
        .withIndex("by_journey_time", (q) => q.eq("journeyId", journeyId))
        .collect();
      for (const entry of entries) await syncLocationRelease(ctx, entry, updated);
    }
  },
});

export const remove = mutation({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, { journeyId }) => {
    await requireJourneyRole(ctx, journeyId, ["owner"]);
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_journey_time", (q) => q.eq("journeyId", journeyId))
      .collect();
    for (const entry of entries) {
      for (const photoId of entry.photoIds) await ctx.storage.delete(photoId);
      await entryLocations.remove(ctx, entry._id);
      await ctx.db.delete(entry._id);
    }
    for (const table of ["journeyMembers", "journeyTags"] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_journey", (q) => q.eq("journeyId", journeyId))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }
    await ctx.db.delete(journeyId);
  },
});

/** Journey header + members. Null when missing or not visible to the viewer. */
export const get = query({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, { journeyId }) => {
    const journey = await ctx.db.get(journeyId);
    if (!journey) return null;
    const viewerId = await getViewerId(ctx);
    const access = await getJourneyAccess(ctx, journey, viewerId);
    if (!access.canView) return null;

    const memberRows = await ctx.db
      .query("journeyMembers")
      .withIndex("by_journey", (q) => q.eq("journeyId", journeyId))
      .collect();
    const members = [];
    for (const row of memberRows) {
      // Pending invites are only shown to members.
      if (row.status !== "active" && !access.isMember) continue;
      members.push({
        role: row.role,
        status: row.status,
        profile: profileSummary(await getProfile(ctx, row.userId)),
      });
    }
    return { journey, access, members };
  },
});

/** Journeys the viewer owns or authors, plus pending invites. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const viewerId = await getViewerId(ctx);
    if (!viewerId) return { journeys: [], invites: [] };
    const memberships = await ctx.db
      .query("journeyMembers")
      .withIndex("by_user", (q) => q.eq("userId", viewerId))
      .collect();
    const journeys = [];
    const invites = [];
    for (const membership of memberships) {
      const journey = await ctx.db.get(membership.journeyId);
      if (!journey) continue;
      if (membership.status === "active") {
        journeys.push({ ...journey, role: membership.role });
      } else {
        invites.push({
          journey,
          invitedBy: profileSummary(await getProfile(ctx, membership.invitedBy)),
        });
      }
    }
    journeys.sort((a, b) => b._creationTime - a._creationTime);
    return { journeys, invites };
  },
});

async function withOwner<T extends { ownerId: string }>(
  ctx: Parameters<typeof getProfile>[0],
  journey: T,
) {
  return { ...journey, owner: profileSummary(await getProfile(ctx, journey.ownerId)) };
}

/** Explore: discoverable journeys with a tag ("#AT" and "at" match). */
export const listByTag = query({
  args: { tag: v.string() },
  handler: async (ctx, args) => {
    const tag = normalizeTag(args.tag);
    if (!tag) return [];
    const rows = await ctx.db
      .query("journeyTags")
      .withIndex("by_tag", (q) => q.eq("tag", tag))
      .order("desc")
      .take(100);
    const results = [];
    for (const row of rows) {
      const journey = await ctx.db.get(row.journeyId);
      if (journey && (await isDiscoverable(ctx, journey))) results.push(await withOwner(ctx, journey));
    }
    return results;
  },
});

/** Explore: most recently created discoverable journeys. */
export const listRecent = query({
  args: {},
  handler: async (ctx) => {
    const journeys = await ctx.db
      .query("journeys")
      .withIndex("by_visibility", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(50);
    const results = [];
    for (const journey of journeys) {
      if (await isDiscoverable(ctx, journey)) results.push(await withOwner(ctx, journey));
    }
    return results;
  },
});

/** Tag autocomplete from tags already in use. */
export const suggestTags = query({
  args: { prefix: v.string() },
  handler: async (ctx, args) => {
    const prefix = normalizeTag(args.prefix);
    if (!prefix) return [];
    const rows = await ctx.db
      .query("journeyTags")
      .withIndex("by_tag", (q) => q.gte("tag", prefix).lt("tag", `${prefix}￿`))
      .take(200);
    return [...new Set(rows.map((r) => r.tag))].slice(0, 10);
  },
});
