# Sojourn — Plan (Draft v1)

A mobile app where long-distance hikers document and share their journeys on any
long-distance trail. A **Journey** is an ordered collection of **Entries**. Each
entry has a timestamp and a geolocation, plus optional text and/or images. Viewing
a journey draws the entries' locations, connected in time order, as a line on a map.

> Status: draft for review. Decisions made so far are in §0; remaining open
> questions are at the bottom.

---

## 0. Decisions log

| # | Topic | Decision |
|---|---|---|
| D1 | Offline | **Offline-first is in v1.** Entries/photos are created locally and synced when signal returns. |
| D2 | Location safety | **Public location is delayed by default.** Per entry, the author can override (publish immediately); doing so shows a warning dialog explaining the risk. |
| D3 | Path | **v1: straight lines between entries.** Continuous track recording is v2, preferably via integration with an existing solution rather than built in-house. |
| D4 | Trails | **No fixed trail catalog.** Users are not locked into trails the app knows about; trail is free-form per journey. No official route overlay in v1. |
| D5 | Authors | **Journeys support multiple authors.** A person must be added as an author on the journey before they can post entries to it. |

---

## 1. Core concepts

| Concept | Description |
|---|---|
| **User** | Hiker account: display name, trail name (e.g. "Sunshine"), avatar, bio. |
| **Journey** | A hike: title, free-text trail name, description, start/end date, status (planned / active / completed), visibility, cover photo, public-location delay. |
| **Journey member** | A user's role on a journey: `owner` or `author`. Only members may post entries. |
| **Entry** | A journal post within a journey by one author: `recorded_at`, `location`, optional `text`, 0..N `photos`, and a `publish_location_immediately` override flag. |
| **Photo** | Image attached to an entry; stored in object storage, with thumbnail. |

Rules:
- An entry must have text **or** at least one photo.
- Every entry has a timestamp and location; both default to "now / current GPS"
  and can be edited.
- The map line is built by sorting a journey's entries by `recorded_at` and
  connecting their points with straight segments (D3).

### Trails (D4)
- `journeys.trail_name` is free text ("Appalachian Trail", "Hayduke Trail",
  "My Scottish coast walk"), with autocomplete from names other users have
  already entered — a suggestion, never a restriction.
- No official route geometry is stored or drawn in v1.

### Multiple authors (D5)
- The journey creator is the `owner`. The owner adds authors (by username or
  invite link); the invitee must accept before becoming an `author`.
- Authors can create entries and edit/delete **their own** entries. Owner can
  edit journey details, manage members, and remove any entry.
- Each entry shows its author. On the map, see open question Q-A on how to draw
  multiple hikers.

### Location delay (D2)
- Each journey has a `location_delay` (default **24h**, see Q-B). For viewers
  who are not members, an entry's location is hidden until
  `recorded_at + location_delay` has passed. Text/photos may still be visible
  (see Q-C).
- When composing an entry, the author can toggle **"Share location now"**.
  Turning it on shows a confirmation dialog, e.g.:
  > *Sharing your exact location in real time lets anyone viewing this journey
  > see where you are right now. Only do this if you're comfortable with that.*
  > [Cancel] [Share now]
- Enforced **server-side** (row-level security / a view), not just hidden in
  the UI, so the location is never sent to clients that shouldn't see it.
- Photos: EXIF GPS is stripped on upload so photos can't leak the location.

## 2. MVP feature set

1. **Auth** — sign up / sign in (email + Apple/Google sign-in).
2. **Journeys** — create, edit, delete; list "my journeys"; free-text trail name.
3. **Members** — invite authors, accept/decline, remove.
4. **Entries** — create with text and/or photos; auto-capture GPS + time; edit/delete; location-delay override with warning.
5. **Journey view** — synchronized **Map** (polyline + markers; tap → entry) and **Timeline** (feed of entries).
6. **Offline-first** — local store + background sync queue (D1).
7. **Sharing** — public/unlisted/private journeys viewable by others (scope pending Q7).

### v2 candidates
- Continuous track recording via integration (D3) — e.g. GPX import from apps
  hikers already use (Gaia GPS, FarOut, Strava, Garmin inReach/Connect,
  CalTopo), or API sync where available. GPX import is the lowest-friction,
  most universal starting point.
- Following, feed, comments/reactions.
- Stats: distance (along entry line or imported track), days, zero days.
- Web viewer for friends & family; export (PDF/GPX).

## 3. Architecture

**Client: React Native with Expo (TypeScript)**
- Expo modules for camera, image picker, location, file system, SQLite.
- Maps: `react-native-maps` for v1; MapLibre with offline tiles is a later option.
- Local store: SQLite (`expo-sqlite` + Drizzle) as on-device source of truth,
  with an outbox queue for pending writes and photo uploads.

**Backend: Supabase** (Postgres + PostGIS, Auth, Storage, Row-Level Security).

**Data model (Postgres)**
```sql
profiles (id uuid pk -> auth.users, username unique, display_name, trail_name,
          avatar_url, bio, created_at)

journeys (id uuid pk, owner_id fk, title, description,
          trail_name text null,                       -- free text (D4)
          status text,                                -- planned | active | completed
          visibility text,                            -- private | unlisted | public
          location_delay interval default '24 hours', -- (D2)
          started_on date, ended_on date, cover_photo_id fk null,
          created_at, updated_at)

journey_members (journey_id fk, user_id fk,
                 role text,                           -- owner | author
                 status text,                         -- invited | active
                 invited_by fk, created_at,
                 primary key (journey_id, user_id))

entries (id uuid pk,                                  -- client-generated (offline)
         journey_id fk, author_id fk,
         recorded_at timestamptz,
         location geography(Point,4326),
         elevation_m real null, accuracy_m real null,
         body text null,
         publish_location_immediately bool default false,  -- (D2 override)
         created_at, updated_at, deleted_at null)

entry_photos (id uuid pk, entry_id fk, storage_path, width, height,
              position int, created_at)
```
- RLS:
  - insert entry ⇒ caller is an active member of the journey.
  - update/delete entry ⇒ caller is the entry's author, or journey owner (delete).
  - read ⇒ members always; others only if journey is `public`/`unlisted`.
- Non-members read entries through a view `public_entries` that returns
  `location = NULL` unless `publish_location_immediately` or
  `now() >= recorded_at + location_delay`.

**Offline sync**
1. Creating an entry writes to SQLite and copies photos into app storage; status `pending`.
2. Sync worker (on foreground / connectivity change / periodic background task)
   uploads photos, then upserts entry rows (idempotent by UUID); marks `synced`.
3. Conflicts: last-write-wins per entry. Since authors only edit their own
   entries, true conflicts are limited to one person on two devices.
4. Membership is checked at sync time; if an author was removed while offline,
   their pending entries fail with a clear message and stay on the device.

**Photos** — resize/compress on device (long edge ~2048px, JPEG ~0.8), thumbnail, strip EXIF GPS.

## 4. Milestones

| # | Milestone | Outcome |
|---|---|---|
| 0 | Scaffold | Expo app, TS, lint/format, CI, Supabase project + migrations |
| 1 | Auth & profiles | Sign up/in, username, profile editing |
| 2 | Journeys | CRUD, free-text trail, visibility, location delay setting |
| 3 | Entries (online) | Text + photos + GPS/time; timeline view |
| 4 | Map view | Polyline + markers, marker → entry detail |
| 5 | Offline-first | SQLite store, outbox sync, retry |
| 6 | Location delay | Server-side enforcement, per-entry override + warning dialog |
| 7 | Multiple authors | Invite/accept/remove, per-author permissions |
| 8 | Sharing & beta | Public browsing/share links, polish, TestFlight / Play internal testing |

## 5. Testing
- Jest unit tests: sync queue, polyline building, validation, delay logic.
- RLS/permission tests against local Supabase (members vs. non-members, delay view).
- React Native Testing Library component tests; Maestro E2E later.

---

## 6. Open questions

**New, from the decisions above**
- **Q-A Multi-author map:** if partners split up (different paces, side trips),
  should the map draw **one line per author** (distinct colors) or **one line**
  through all entries in time order? (Recommendation: one line per author —
  a single line zig-zags between two people's positions.)
- **Q-B Delay default:** is 24 hours a good default? Should the owner be able to change it per journey (e.g. 0–72h)?
- **Q-C During the delay:** should non-members see the entry's text/photos
  immediately with the location hidden, or should the whole entry be held back?
  (Photos of landmarks/trail signs can reveal location too.)
- **Q-D Followers/trusted people:** should the delay also apply to people the
  hiker trusts (family), or should there be a "trusted viewers" list that
  sees live locations?
- **Q-E Author removal:** when an author is removed or leaves, do their entries stay in the journey?

**Still open from v0**
6. Can users **drag the pin** to correct/set an entry's location (e.g. writing up
   last night's camp)? Use a photo's EXIF location/time to pre-fill?
7. **Social features** in v1: just shareable journeys, or also following / feed /
   comments / likes? Browse/search journeys by trail name and year?
8. **Platforms:** iOS + Android both? Web viewer for family in v1?
9. **Stack & scope:** OK with Expo + Supabase? POC vs. production foundation?
10. Photos per entry limit, video support, app name/branding.
