# Sojourn — Plan (v2, proof of concept)

A mobile + web app where long-distance hikers document and share their journeys
on any long-distance trail. A **Journey** is an ordered collection of **Entries**.
Each entry has a timestamp and a geolocation, plus optional text and/or images.
Viewing a journey draws the entries' locations, connected in time order, as a
line on a map.

---

## 0. Decisions log

| # | Topic | Decision |
|---|---|---|
| D1 | Offline | **Offline-first is in v1.** Entries/photos are created locally and synced when signal returns. |
| D2 | Location safety | **Public location is delayed by default.** Per entry, the author can override (publish immediately); doing so shows a warning dialog explaining the risk. |
| D3 | Path | **v1: straight lines between entries.** Continuous track recording is v2, preferably via integration with an existing solution. |
| D4 | Trails | **No trail catalog.** Journeys are labelled with free-form **tags** (`#at`, `#AppalachianTrail`, `#pnt2027`). |
| D5 | Authors | **Multiple authors per journey.** A person must be added as an author before they can post. |
| D6 | Entry location | Location can be **edited after an entry is created**. A photo's **EXIF location/time** can pre-fill the entry. |
| D7 | Social | **Follow hikers + feed** in v1, gated by each hiker's privacy settings. |
| D8 | Platforms | **iOS, Android, and web.** |
| D9 | Stack | **Convex** backend with the **`@convex-dev/geospatial`** component; scaffolded with Better-T-Stack (see §3). This is a **proof of concept**. |
| D10 | Media | **Up to 5 photos per entry**, no video in v1. |
| D11 | Brand | Name **Sojourn**. Greens + earth tones, **sharp edges** — "a map and a journal on a table". |

### Assumptions for questions not yet answered
These are the defaults the POC uses; easy to change.

| # | Question | Default chosen |
|---|---|---|
| A1 | Multi-author map: one line or one per author? | **One line per author**, each in a distinct earth-tone color. |
| A2 | Location delay default / configurable? | **24h default**, owner can set per journey (0–72h). |
| A3 | During the delay, show text/photos? | **Show text/photos, hide location** (map marker appears once the delay passes). |
| A4 | Do followers bypass the delay? | **No** — only journey members see live locations. |
| A5 | Removed author's entries | **Stay in the journey** (still attributed to them). |

---

## 1. Domain model

| Concept | Description |
|---|---|
| **User / Profile** | Better Auth user + profile: username, display name, trail name, bio, avatar, **privacy settings**. |
| **Journey** | Title, description, **tags**, start/end date, status (planned / active / completed), visibility, location delay, cover photo. |
| **Journey member** | `owner` or `author`; `invited` → `active`. Only active members post entries. |
| **Entry** | One author; `recordedAt`, `location {lat,lng}`, optional `body`, 0–5 photos, `shareLocationNow` override flag. |
| **Follow** | follower → followee, with `pending` / `accepted` state for private profiles. |

Rules
- An entry needs text **or** at least one photo.
- Timestamp & location default to now / current GPS (or a photo's EXIF), and
  are editable later (D6), including by dragging the pin on a map.
- Map line = entries sorted by `recordedAt`, grouped by author, straight segments.

### Tags (D4)
- Stored normalized (lower-case, no `#`) for matching, display form kept.
  `#AppalachianTrail` and `#appalachiantrail` match; `#at` and
  `#appalachiantrail` are different tags (no alias system in the POC).
- Tag autocomplete from existing tags; browse journeys by tag.

### Privacy (D2, D7)
Profile privacy settings:
- `profileVisibility`: `public` (anyone can follow) | `approval` (follow requests need approval) | `private` (no followers, no discovery).
- Journey `visibility`: `public` | `followers` | `unlisted` (link only) | `private` (members only).

Location delay
- Non-members receive `location = null` for an entry until
  `recordedAt + journey.locationDelay` has passed, unless the author set
  `shareLocationNow`. Turning that on shows a warning dialog:
  > *Sharing your location now lets anyone who can see this journey know where
  > you are right now. Only do this if you're comfortable with that.*
- Enforced **in Convex query functions** — redacted server-side, never sent to the client.
- Geospatial index only contains entries whose location is publicly visible
  (see §3), so map/area queries can't leak hidden locations.
- EXIF GPS is read on device for pre-fill, then **stripped** before upload
  (re-encoding the image via `expo-image-manipulator` drops metadata).

### Feed (D7)
- Feed = recent entries from journeys the viewer may see, authored by people
  they follow (accepted follows), newest first, paginated.
- POC: fan-out-on-read (query follows → their recent entries). Fine at POC scale.

---

## 2. Feature scope (POC)

1. Auth (Better Auth email/password; social sign-in later) + profile & privacy settings.
2. Journeys: create / edit / delete, tags, visibility, location delay.
3. Members: owner invites authors by username; invitee accepts/declines.
4. Entries: text + up to 5 photos, GPS/EXIF pre-fill, edit location after creation, "share location now" + warning.
5. Journey view: map (polylines per author + markers) and timeline.
6. Follow/unfollow, follow requests, feed.
7. Explore: browse public journeys by tag.
8. Offline-first entry creation on mobile (outbox, see §3).

### v2 candidates
- Continuous tracking via integration — start with **GPX import** (Gaia GPS,
  FarOut, CalTopo, Garmin, Strava all export GPX), API sync later.
- Comments/reactions, notifications, stats, offline map tiles, export, nearby-hikers via geospatial queries.

---

## 3. Architecture

### Scaffold
```
bun create better-t-stack@latest sojourn \
  --frontend tanstack-router native-unistyles --backend convex --runtime none \
  --api none --auth better-auth --payments none --database none --orm none \
  --db-setup none --package-manager bun --git --web-deploy docker \
  --server-deploy none --install --addons skills turborepo --examples none
```
Monorepo (Turborepo + bun workspaces):
- `apps/web` — React + TanStack Router (web)
- `apps/native` — Expo + Unistyles (iOS/Android)
- `packages/backend` — Convex functions, schema, Better Auth integration

### Convex schema (sketch)
```ts
profiles:        { userId, username, displayName, trailName?, bio?, avatarId?,
                   profileVisibility }                         // index by_user, by_username
journeys:        { ownerId, title, description?, tags: string[], status,
                   visibility, locationDelayHours, startedOn?, endedOn?,
                   coverPhotoId? }                             // index by_owner
journeyTags:     { journeyId, tag }                            // index by_tag (lookup table)
journeyMembers:  { journeyId, userId, role, status, invitedBy } // by_journey, by_user
entries:         { journeyId, authorId, clientId, recordedAt,
                   location: { lat, lng }, body?, photoIds: Id<"_storage">[],
                   shareLocationNow, editedAt? }               // by_journey_time, by_author_time, by_client_id
follows:         { followerId, followeeId, status }            // by_follower, by_followee
```
- `@convex-dev/geospatial` index: key = entryId, coordinates = location,
  filter keys = journeyId / visibility. An entry is inserted into the index
  only once its location is publicly visible (immediately if `shareLocationNow`,
  otherwise via a **scheduled function** at `recordedAt + delay`). Updated on
  location edits, removed on delete. Used for "journeys near here" / explore-by-area.
- Photos: Convex file storage (`generateUploadUrl` → upload → store `_storage` id).

### Offline-first on mobile (D1)
Convex is online-first (live queries over WebSocket), so offline entry creation
is handled by a small client-side outbox:
1. Compose entry offline → save to a persisted outbox (AsyncStorage for metadata,
   compressed photo files in the app's document directory). Show it immediately
   in the journey timeline as "pending sync".
2. When connectivity returns (NetInfo / Convex connection state), for each item:
   upload photos → call `entries.create` with a client-generated `clientId`.
3. `entries.create` is **idempotent on `clientId`**, so retries never duplicate.
4. Failures (e.g. author removed meanwhile) stay in the outbox with an error.
- Journeys/feeds viewed online are cached for offline reading on a best-effort basis (later).

### Maps
- Web: MapLibre GL (`react-map-gl/maplibre`) with an OpenStreetMap-based topo/outdoor style.
- Native: `react-native-maps` (Apple/Google) for the POC.
- Shared util: `buildAuthorPaths(entries) → { authorId, coords[] }[]`.

### Design system (D11)
- Palette: forest `#2F4A3A`, moss `#5B7553`, sage `#A3B18A`, parchment `#F2EBDD`,
  sand `#D9C9A8`, bark `#6B4F3A`, rust (accent/danger) `#A4532B`, ink `#1F2420`.
- Border radius **0–2px**, 1px ink-tinted rules like a ruled notebook, serif
  display type (journal) + clean sans for UI, monospace for coordinates/timestamps
  (map-label feel).

---

## 4. Milestones

| # | Milestone | POC status |
|---|---|---|
| 0 | Scaffold, theme tokens, CI basics | ✅ (no CI workflow yet) |
| 1 | Auth + profiles + privacy settings | ✅ web + native |
| 2 | Journeys (tags, visibility, delay) | ✅ create on both; full management on web |
| 3 | Entries (text, photos, GPS/EXIF, edit location) + timeline | ✅ |
| 4 | Map view (per-author polylines) — web + native | ✅ |
| 5 | Location delay enforcement + override warning + geospatial index | ✅ (`entries.inArea` not yet used in UI) |
| 6 | Members (invite/accept) | ✅ invite on both; remove/cancel on web |
| 7 | Follow + feed + explore-by-tag | ✅ |
| 8 | Offline outbox on mobile | ✅ create offline; edits need signal |

### Known gaps / next steps
- Native: journey settings (edit/delete, delay, visibility) and entry time editing are web-only for now.
- Offline *reading* (cached journeys/feed) isn't implemented; only writing is offline.
- `followers` visibility is based on following the journey **owner** (not co-authors).
- No journey cover photo, comments/reactions, or notifications yet.
- Feed is fan-out-on-read — fine for a POC, revisit for scale.
- Map tiles: OpenTopoMap is for light use; pick a hosted provider (and offline tiles) before launch.
- Convex `_generated/` was hand-written; regenerate with `convex dev`.

## 5. Testing
- `convex-test` + Vitest for functions: permissions, delay redaction, idempotent create, tags.
- Unit tests for path building, tag normalization.
- Manual smoke on web; Expo Go for native.
