import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const profileVisibility = v.union(
  v.literal("public"), // anyone can follow
  v.literal("approval"), // follow requests must be approved
  v.literal("private"), // no followers, not discoverable
);

export const journeyVisibility = v.union(
  v.literal("public"),
  v.literal("followers"),
  v.literal("unlisted"),
  v.literal("private"),
);

export const journeyStatus = v.union(
  v.literal("planned"),
  v.literal("active"),
  v.literal("completed"),
);

export const location = v.object({ lat: v.number(), lng: v.number() });

export default defineSchema({
  // `userId` everywhere is the Better Auth user id (the JWT `subject`).
  profiles: defineTable({
    userId: v.string(),
    username: v.string(), // lower-case, unique
    displayName: v.string(),
    trailName: v.optional(v.string()),
    bio: v.optional(v.string()),
    profileVisibility,
  })
    .index("by_user", ["userId"])
    .index("by_username", ["username"]),

  journeys: defineTable({
    ownerId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    tags: v.array(v.string()), // display form, e.g. "AppalachianTrail"
    status: journeyStatus,
    visibility: journeyVisibility,
    // Entries are hidden from non-members until this long after recordedAt.
    delayHours: v.number(),
    startedOn: v.optional(v.string()), // YYYY-MM-DD
    endedOn: v.optional(v.string()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_visibility", ["visibility"]),

  // Lookup table so journeys can be found by normalized tag.
  journeyTags: defineTable({
    journeyId: v.id("journeys"),
    tag: v.string(), // normalized: lower-case, no "#"
  })
    .index("by_tag", ["tag"])
    .index("by_journey", ["journeyId"]),

  journeyMembers: defineTable({
    journeyId: v.id("journeys"),
    userId: v.string(),
    role: v.union(v.literal("owner"), v.literal("author")),
    status: v.union(v.literal("invited"), v.literal("active")),
    invitedBy: v.string(),
  })
    .index("by_journey", ["journeyId"])
    .index("by_journey_user", ["journeyId", "userId"])
    .index("by_user", ["userId"]),

  entries: defineTable({
    journeyId: v.id("journeys"),
    authorId: v.string(),
    // Generated on the device so offline retries are idempotent.
    clientId: v.string(),
    recordedAt: v.number(), // ms since epoch
    location,
    body: v.optional(v.string()),
    photoIds: v.array(v.id("_storage")),
    // Author chose to skip the safety delay and publish this entry immediately.
    publishNow: v.boolean(),
    // True once non-members may see the entry (delay passed or publishNow).
    published: v.boolean(),
  })
    .index("by_journey_time", ["journeyId", "recordedAt"])
    .index("by_author_time", ["authorId", "recordedAt"])
    .index("by_author_client", ["authorId", "clientId"]),

  follows: defineTable({
    followerId: v.string(),
    followeeId: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted")),
  })
    .index("by_follower", ["followerId"])
    .index("by_followee", ["followeeId", "status"])
    .index("by_pair", ["followerId", "followeeId"]),
});
