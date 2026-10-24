import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { getJourneyAccess, getViewerId, requireJourneyRole, requireViewerId } from "./lib/access";
import { MAX_BODY_LENGTH, MAX_PHOTOS_PER_ENTRY } from "./lib/constants";
import { canSeeEntry, toEntryView } from "./lib/entryView";
import { entryLocations, releaseAt, syncRelease } from "./lib/geo";
import { location } from "./schema";

function validateLocation(loc: { lat: number; lng: number }) {
  if (
    !Number.isFinite(loc.lat) ||
    !Number.isFinite(loc.lng) ||
    Math.abs(loc.lat) > 90 ||
    Math.abs(loc.lng) > 180
  ) {
    throw new ConvexError("Invalid location.");
  }
}

function validateContent(body: string | undefined, photoIds: Id<"_storage">[]) {
  if (photoIds.length > MAX_PHOTOS_PER_ENTRY) {
    throw new ConvexError(`An entry can have at most ${MAX_PHOTOS_PER_ENTRY} photos.`);
  }
  if (body && body.length > MAX_BODY_LENGTH) throw new ConvexError("Entry text is too long.");
  if (!body?.trim() && photoIds.length === 0) {
    throw new ConvexError("An entry needs some text or at least one photo.");
  }
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireViewerId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Create an entry. Idempotent on `clientId` so the mobile outbox can retry
 * safely after a flaky connection.
 */
export const create = mutation({
  args: {
    journeyId: v.id("journeys"),
    clientId: v.string(),
    recordedAt: v.number(),
    location,
    body: v.optional(v.string()),
    photoIds: v.array(v.id("_storage")),
    publishNow: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { viewerId, journey } = await requireJourneyRole(ctx, args.journeyId, ["owner", "author"]);
    const existing = await ctx.db
      .query("entries")
      .withIndex("by_author_client", (q) => q.eq("authorId", viewerId).eq("clientId", args.clientId))
      .unique();
    if (existing) return existing._id;

    validateLocation(args.location);
    validateContent(args.body, args.photoIds);
    const entryId = await ctx.db.insert("entries", {
      journeyId: args.journeyId,
      authorId: viewerId,
      clientId: args.clientId,
      recordedAt: args.recordedAt,
      location: args.location,
      body: args.body?.trim() || undefined,
      photoIds: args.photoIds,
      publishNow: args.publishNow,
      published: false,
    });
    await syncRelease(ctx, (await ctx.db.get(entryId))!, journey);
    return entryId;
  },
});

/** Authors can edit their own entries, including correcting the location. */
export const update = mutation({
  args: {
    entryId: v.id("entries"),
    recordedAt: v.optional(v.number()),
    location: v.optional(location),
    body: v.optional(v.string()),
    photoIds: v.optional(v.array(v.id("_storage"))),
    publishNow: v.optional(v.boolean()),
  },
  handler: async (ctx, { entryId, ...args }) => {
    const viewerId = await requireViewerId(ctx);
    const entry = await ctx.db.get(entryId);
    if (!entry) throw new ConvexError("Entry not found.");
    if (entry.authorId !== viewerId) throw new ConvexError("You can only edit your own entries.");
    const journey = (await ctx.db.get(entry.journeyId))!;

    if (args.location) validateLocation(args.location);
    const body = args.body !== undefined ? args.body.trim() || undefined : entry.body;
    const photoIds = args.photoIds ?? entry.photoIds;
    validateContent(body, photoIds);
    for (const removed of entry.photoIds.filter((id) => !photoIds.includes(id))) {
      await ctx.storage.delete(removed);
    }

    await ctx.db.patch(entryId, {
      body,
      photoIds,
      ...(args.recordedAt !== undefined ? { recordedAt: args.recordedAt } : {}),
      ...(args.location ? { location: args.location } : {}),
      ...(args.publishNow !== undefined ? { publishNow: args.publishNow } : {}),
    });
    await syncRelease(ctx, (await ctx.db.get(entryId))!, journey);
  },
});

/** Authors delete their own entries; the owner can delete any entry. */
export const remove = mutation({
  args: { entryId: v.id("entries") },
  handler: async (ctx, { entryId }) => {
    const viewerId = await requireViewerId(ctx);
    const entry = await ctx.db.get(entryId);
    if (!entry) return;
    const journey = await ctx.db.get(entry.journeyId);
    if (entry.authorId !== viewerId && journey?.ownerId !== viewerId) {
      throw new ConvexError("You can't delete this entry.");
    }
    for (const photoId of entry.photoIds) await ctx.storage.delete(photoId);
    await entryLocations.remove(ctx, entryId);
    await ctx.db.delete(entryId);
  },
});

/** Scheduled at `recordedAt + delay`; no-ops if the entry changed since. */
export const releaseEntry = internalMutation({
  args: { entryId: v.id("entries") },
  handler: async (ctx, { entryId }) => {
    const entry = await ctx.db.get(entryId);
    if (!entry || entry.published) return;
    const journey = await ctx.db.get(entry.journeyId);
    if (!journey || Date.now() < releaseAt(entry, journey)) return;
    await syncRelease(ctx, entry, journey);
  },
});

/** All entries of a journey in time order (oldest first). */
export const listForJourney = query({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, { journeyId }) => {
    const journey = await ctx.db.get(journeyId);
    if (!journey) return null;
    const access = await getJourneyAccess(ctx, journey, await getViewerId(ctx));
    if (!access.canView) return null;
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_journey_time", (q) => q.eq("journeyId", journeyId))
      .collect();
    return await Promise.all(
      entries
        .filter((e) => canSeeEntry(e, access.isMember))
        .map((e) => toEntryView(ctx, e, journey, access.isMember)),
    );
  },
});

export const get = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, { entryId }) => {
    const entry = await ctx.db.get(entryId);
    if (!entry) return null;
    const journey = (await ctx.db.get(entry.journeyId))!;
    const access = await getJourneyAccess(ctx, journey, await getViewerId(ctx));
    if (!access.canView || !canSeeEntry(entry, access.isMember)) return null;
    return {
      entry: await toEntryView(ctx, entry, journey, access.isMember),
      journey: { _id: journey._id, title: journey.title },
      canEdit: entry.authorId === (await getViewerId(ctx)),
    };
  },
});

/** Published entry locations inside a map rectangle (only published entries are indexed). */
export const inArea = query({
  args: {
    rectangle: v.object({ west: v.number(), south: v.number(), east: v.number(), north: v.number() }),
  },
  handler: async (ctx, { rectangle }) => {
    const { results } = await entryLocations.query(ctx, {
      shape: { type: "rectangle", rectangle },
      filter: (q) => q.eq("visibility", "public"),
      limit: 100,
    });
    const out = [];
    for (const { key, coordinates } of results) {
      const entry = await ctx.db.get(key);
      if (!entry) continue;
      const journey = await ctx.db.get(entry.journeyId);
      if (!journey) continue;
      out.push({
        entryId: key,
        journeyId: journey._id,
        journeyTitle: journey.title,
        recordedAt: entry.recordedAt,
        location: { lat: coordinates.latitude, lng: coordinates.longitude },
      });
    }
    return out;
  },
});
