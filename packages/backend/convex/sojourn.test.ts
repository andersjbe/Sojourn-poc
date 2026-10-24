/// <reference types="vite/client" />
import geospatialTest from "@convex-dev/geospatial/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { buildAuthorPaths } from "./lib/paths";
import { parseTags } from "./lib/tags";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const HOUR = 60 * 60 * 1000;
const SPRINGER = { lat: 34.6266, lng: -84.1938 };
const NEELS_GAP = { lat: 34.7346, lng: -83.9184 };

function setup() {
  const t = convexTest(schema, modules);
  geospatialTest.register(t, "geospatial");
  return t;
}

async function hiker(t: ReturnType<typeof setup>, username: string) {
  const as = t.withIdentity({ subject: `user_${username}` });
  await as.mutation(api.profiles.create, { username, displayName: username });
  return as;
}

async function fakePhoto(t: ReturnType<typeof setup>) {
  return await t.run((ctx) => ctx.storage.store(new Blob(["jpg"])));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2027-04-01T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("profiles", () => {
  test("usernames are unique and validated", async () => {
    const t = setup();
    await hiker(t, "sunshine");
    const other = t.withIdentity({ subject: "user_other" });
    await expect(
      other.mutation(api.profiles.create, { username: "Sunshine", displayName: "x" }),
    ).rejects.toThrow(/taken/);
    await expect(
      other.mutation(api.profiles.create, { username: "a!", displayName: "x" }),
    ).rejects.toThrow(/Usernames/);
  });
});

describe("journeys", () => {
  test("tags are cleaned, deduplicated, and searchable case-insensitively", async () => {
    const t = setup();
    const sunshine = await hiker(t, "sunshine");
    const journeyId = await sunshine.mutation(api.journeys.create, {
      title: "AT 2027",
      tags: ["#AT", "#AppalachianTrail", "#appalachiantrail", "nobo"],
    });
    const journey = await t.run((ctx) => ctx.db.get(journeyId));
    expect(journey?.tags).toEqual(["AT", "AppalachianTrail", "nobo"]);
    expect((await t.query(api.journeys.listByTag, { tag: "#APPALACHIANTRAIL" })).map((j) => j._id)).toEqual([
      journeyId,
    ]);
    expect(await t.query(api.journeys.suggestTags, { prefix: "app" })).toEqual(["appalachiantrail"]);
  });

  test("private journeys are hidden from non-members", async () => {
    const t = setup();
    const owner = await hiker(t, "owner");
    const journeyId = await owner.mutation(api.journeys.create, {
      title: "Secret",
      tags: [],
      visibility: "private",
    });
    expect(await t.query(api.journeys.get, { journeyId })).toBeNull();
    expect(await t.query(api.entries.listForJourney, { journeyId })).toBeNull();
    expect(await owner.query(api.journeys.get, { journeyId })).not.toBeNull();
  });

  test("followers-only journeys need an accepted follow", async () => {
    const t = setup();
    const owner = await hiker(t, "owner");
    const fan = await hiker(t, "fan");
    await owner.mutation(api.profiles.update, { profileVisibility: "approval" });
    const journeyId = await owner.mutation(api.journeys.create, {
      title: "Friends only",
      tags: [],
      visibility: "followers",
    });
    expect(await fan.mutation(api.follows.follow, { userId: "user_owner" })).toBe("pending");
    expect(await fan.query(api.journeys.get, { journeyId })).toBeNull();
    expect(await owner.query(api.follows.requests, {})).toHaveLength(1);
    await owner.mutation(api.follows.respond, { followerId: "user_fan", accept: true });
    expect(await fan.query(api.journeys.get, { journeyId })).not.toBeNull();
  });
});

describe("entries", () => {
  async function journeyWithEntry(shareLocationNow: boolean) {
    const t = setup();
    const owner = await hiker(t, "owner");
    const journeyId = await owner.mutation(api.journeys.create, { title: "PNT", tags: ["pnt"] });
    const entryId = await owner.mutation(api.entries.create, {
      journeyId,
      clientId: "c1",
      recordedAt: Date.now(),
      location: SPRINGER,
      body: "Day one",
      photoIds: [],
      shareLocationNow,
    });
    return { t, owner, journeyId, entryId };
  }

  test("location is hidden from the public until the delay passes", async () => {
    const { t, owner, journeyId } = await journeyWithEntry(false);
    const [publicView] = (await t.query(api.entries.listForJourney, { journeyId }))!;
    expect(publicView.location).toBeNull();
    expect(publicView.body).toBe("Day one");
    const [ownerView] = (await owner.query(api.entries.listForJourney, { journeyId }))!;
    expect(ownerView.location).toEqual(SPRINGER);
    expect(ownerView.locationStatus?.isPublic).toBe(false);
    // Hidden locations are not in the geospatial index either.
    const area = { west: -85, south: 34, east: -83, north: 35 };
    expect(await t.query(api.entries.inArea, { rectangle: area })).toHaveLength(0);

    vi.advanceTimersByTime(24 * HOUR + 1000);
    await t.finishInProgressScheduledFunctions();

    const [released] = (await t.query(api.entries.listForJourney, { journeyId }))!;
    expect(released.location).toEqual(SPRINGER);
    expect(await t.query(api.entries.inArea, { rectangle: area })).toHaveLength(1);
  });

  test("'share location now' publishes immediately", async () => {
    const { t, journeyId } = await journeyWithEntry(true);
    const [view] = (await t.query(api.entries.listForJourney, { journeyId }))!;
    expect(view.location).toEqual(SPRINGER);
  });

  test("raising the delay hides an already-released location again", async () => {
    const { t, owner, journeyId } = await journeyWithEntry(false);
    await owner.mutation(api.journeys.update, { journeyId, locationDelayHours: 0 });
    expect((await t.query(api.entries.listForJourney, { journeyId }))![0].location).toEqual(SPRINGER);
    await owner.mutation(api.journeys.update, { journeyId, locationDelayHours: 48 });
    expect((await t.query(api.entries.listForJourney, { journeyId }))![0].location).toBeNull();
  });

  test("create is idempotent on clientId (offline retries)", async () => {
    const { owner, journeyId, entryId } = await journeyWithEntry(false);
    const again = await owner.mutation(api.entries.create, {
      journeyId,
      clientId: "c1",
      recordedAt: Date.now(),
      location: SPRINGER,
      body: "Day one",
      photoIds: [],
      shareLocationNow: false,
    });
    expect(again).toBe(entryId);
    expect(await owner.query(api.entries.listForJourney, { journeyId })).toHaveLength(1);
  });

  test("validates content, photo count, and location", async () => {
    const { t, owner, journeyId } = await journeyWithEntry(false);
    const base = { journeyId, recordedAt: Date.now(), location: SPRINGER, shareLocationNow: false };
    await expect(
      owner.mutation(api.entries.create, { ...base, clientId: "empty", photoIds: [] }),
    ).rejects.toThrow(/text or at least one photo/);
    const photos: Id<"_storage">[] = [];
    for (let i = 0; i < 6; i++) photos.push(await fakePhoto(t));
    await expect(
      owner.mutation(api.entries.create, { ...base, clientId: "many", photoIds: photos }),
    ).rejects.toThrow(/at most 5/);
    await expect(
      owner.mutation(api.entries.create, {
        ...base,
        clientId: "bad",
        body: "x",
        photoIds: [],
        location: { lat: 91, lng: 0 },
      }),
    ).rejects.toThrow(/Invalid location/);
    // Photo-only entries are fine.
    await owner.mutation(api.entries.create, { ...base, clientId: "photo", photoIds: photos.slice(0, 5) });
  });

  test("authors can correct an entry's location later", async () => {
    const { owner, journeyId, entryId } = await journeyWithEntry(true);
    await owner.mutation(api.entries.update, { entryId, location: NEELS_GAP });
    const [view] = (await owner.query(api.entries.listForJourney, { journeyId }))!;
    expect(view.location).toEqual(NEELS_GAP);
  });
});

describe("multiple authors", () => {
  test("only invited, accepted authors can post; they edit only their own entries", async () => {
    const t = setup();
    const owner = await hiker(t, "owner");
    const partner = await hiker(t, "partner");
    const stranger = await hiker(t, "stranger");
    const journeyId = await owner.mutation(api.journeys.create, { title: "Duo", tags: [] });
    const entry = {
      journeyId,
      recordedAt: Date.now(),
      location: SPRINGER,
      body: "hi",
      photoIds: [],
      shareLocationNow: false,
    };

    await expect(partner.mutation(api.entries.create, { ...entry, clientId: "p0" })).rejects.toThrow(
      /permission/,
    );
    await owner.mutation(api.members.invite, { journeyId, username: "@Partner" });
    // Invited but not yet accepted.
    await expect(partner.mutation(api.entries.create, { ...entry, clientId: "p1" })).rejects.toThrow(
      /permission/,
    );
    expect((await partner.query(api.journeys.listMine, {})).invites).toHaveLength(1);
    await partner.mutation(api.members.respond, { journeyId, accept: true });
    const partnerEntry = await partner.mutation(api.entries.create, { ...entry, clientId: "p2" });
    const ownerEntry = await owner.mutation(api.entries.create, {
      ...entry,
      clientId: "o1",
      location: NEELS_GAP,
    });

    await expect(partner.mutation(api.entries.update, { entryId: ownerEntry, body: "x" })).rejects.toThrow(
      /your own/,
    );
    await expect(stranger.mutation(api.entries.remove, { entryId: partnerEntry })).rejects.toThrow();

    // Members see live locations; one path per author.
    const entries = (await partner.query(api.entries.listForJourney, { journeyId }))!;
    expect(buildAuthorPaths(entries)).toHaveLength(2);

    // Removed authors' entries stay.
    await owner.mutation(api.members.remove, { journeyId, userId: "user_partner" });
    expect(await owner.query(api.entries.listForJourney, { journeyId })).toHaveLength(2);
    await expect(partner.mutation(api.entries.create, { ...entry, clientId: "p3" })).rejects.toThrow(
      /permission/,
    );
  });
});

describe("feed", () => {
  test("shows followed hikers' visible entries, newest first", async () => {
    const t = setup();
    const a = await hiker(t, "alpha");
    const b = await hiker(t, "bravo");
    const reader = await hiker(t, "reader");
    const pub = await a.mutation(api.journeys.create, { title: "Public", tags: [] });
    const priv = await a.mutation(api.journeys.create, { title: "Private", tags: [], visibility: "private" });
    const other = await b.mutation(api.journeys.create, { title: "Bravo", tags: [] });
    const post = (as: typeof a, journeyId: Id<"journeys">, clientId: string, at: number) =>
      as.mutation(api.entries.create, {
        journeyId,
        clientId,
        recordedAt: at,
        location: SPRINGER,
        body: clientId,
        photoIds: [],
        shareLocationNow: false,
      });
    await post(a, pub, "a1", Date.now() - 2 * HOUR);
    await post(a, priv, "a2", Date.now() - HOUR);
    await post(b, other, "b1", Date.now());

    await reader.mutation(api.follows.follow, { userId: "user_alpha" });
    expect((await reader.query(api.feed.get, {})).map((e) => e.body)).toEqual(["a1"]);
    await reader.mutation(api.follows.follow, { userId: "user_bravo" });
    expect((await reader.query(api.feed.get, {})).map((e) => e.body)).toEqual(["b1", "a1"]);
  });

  test("private profiles can't be followed", async () => {
    const t = setup();
    const hermit = await hiker(t, "hermit");
    const fan = await hiker(t, "fan");
    await hermit.mutation(api.profiles.update, { profileVisibility: "private" });
    await expect(fan.mutation(api.follows.follow, { userId: "user_hermit" })).rejects.toThrow(
      /isn't accepting/,
    );
  });
});

describe("pure helpers", () => {
  test("parseTags", () => {
    expect(parseTags("#at #AppalachianTrail, nobo #AT ##")).toEqual(["at", "AppalachianTrail", "nobo"]);
  });

  test("buildAuthorPaths sorts by time and skips hidden locations", () => {
    const paths = buildAuthorPaths([
      { authorId: "a", recordedAt: 2, location: NEELS_GAP },
      { authorId: "a", recordedAt: 1, location: SPRINGER },
      { authorId: "a", recordedAt: 3, location: null },
    ]);
    expect(paths).toEqual([{ authorId: "a", coords: [SPRINGER, NEELS_GAP] }]);
  });
});
