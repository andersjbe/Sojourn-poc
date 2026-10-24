# Sojourn — Plan (Draft v0)

A mobile app where long-distance hikers (AT, PCT, CDT, PNT, …) document and share
their thru-hikes. A **Journey** is an ordered collection of **Entries**. Each entry
has a timestamp and a geolocation, plus optional text and/or images. Viewing a
journey draws the entries' locations, connected in time order, as a line on a map.

> Status: draft for review. Open questions are at the bottom; answers will change
> the stack and scope sections.

---

## 1. Core concepts

| Concept | Description |
|---|---|
| **User** | Hiker account: display name, trail name (e.g. "Sunshine"), avatar, bio. |
| **Journey** | A hike: title, trail (optional link to a known trail), start/end date, status (planned / active / completed), visibility, cover photo. |
| **Entry** | A journal post within a journey: `timestamp`, `location` (lat/lng, optional elevation & accuracy), optional `text`, 0..N `photos`. |
| **Photo** | Image attached to an entry; stored in object storage, with thumbnail. |
| **Trail** (later) | Reference trail with an official route geometry (GPX/GeoJSON) for overlay and "mile marker" calculation. |

Rules:
- An entry must have text **or** at least one photo (not empty).
- Every entry has a timestamp and a location; both default to "now / current GPS"
  but can be edited (e.g. writing up yesterday's camp in the evening).
- The map line is built by sorting a journey's entries by timestamp and
  connecting their points.

## 2. MVP feature set

1. **Auth** — sign up / sign in (email + Apple/Google sign-in).
2. **Journeys** — create, edit, delete; list "my journeys".
3. **Entries** — create with text and/or photos; auto-capture GPS + time; edit/delete.
4. **Journey view** — two synchronized views:
   - **Map**: polyline through entry locations, markers per entry, tap a marker to open the entry.
   - **Timeline**: scrolling feed of entries (newest or oldest first).
5. **Sharing** — public/unlisted journeys viewable by others in-app (and via a share link — see questions).
6. **Offline-first entry creation** — entries and photos are saved locally and
   synced when signal returns. (Assumed essential; see Q1.)

### Post-MVP candidates
- Follow hikers; feed of followed journeys; comments / reactions.
- Reference trail overlay + "mile X of 2,198" calculation, % complete.
- Stats: miles/day, zero days, elevation.
- Import a photo's EXIF location/time to pre-fill an entry.
- Web viewer for friends & family without the app.
- Background GPS breadcrumb tracking (a detailed track between entries).
- Export journey (PDF/GPX).

## 3. Proposed architecture (pending answers)

**Client: React Native with Expo (TypeScript)**
- One codebase for iOS + Android; Expo modules for camera, image picker, location,
  file system, SQLite.
- Maps: `react-native-maps` (Apple/Google maps) for MVP; consider MapLibre with
  offline topo tiles later (hikers often have no signal).
- Local store: SQLite (`expo-sqlite`, possibly via Drizzle) as source of truth on
  device, plus an outbox queue for pending uploads.

**Backend: Supabase** (managed Postgres + PostGIS, Auth, Storage, Row-Level Security)
- Fastest path for a POC; no custom server initially.
- Alternative: Firebase (weaker geo/relational querying), or a custom
  Node/Postgres API (more work, more control).

**Data model (Postgres)**
```sql
profiles  (id uuid pk -> auth.users, display_name, trail_name, avatar_url, bio, created_at)
journeys  (id uuid pk, owner_id fk, title, description, trail_id fk null,
           status text, visibility text, -- 'private' | 'unlisted' | 'public'
           started_on date, ended_on date, cover_photo_id fk null,
           created_at, updated_at)
entries   (id uuid pk, journey_id fk, author_id fk,
           recorded_at timestamptz,          -- the entry's timestamp
           location geography(Point,4326),   -- PostGIS
           elevation_m real null, accuracy_m real null,
           body text null,
           created_at, updated_at, deleted_at null)
entry_photos (id uuid pk, entry_id fk, storage_path, width, height,
              position int, taken_at timestamptz null, created_at)
trails    (later: id, name, slug, route geography(LineString))
```
- IDs are client-generated UUIDs so entries created offline keep their identity on sync.
- RLS: owners have full access; others can read only `public`/`unlisted` journeys.
- Map line: query entries ordered by `recorded_at` → build GeoJSON LineString
  (client-side for MVP; server view `ST_MakeLine` later).

**Offline sync (simplified)**
1. Creating an entry writes to local SQLite + copies photos to app storage, marks `pending`.
2. A sync worker (on app foreground / connectivity change) uploads photos, then
   upserts the entry row; marks `synced`.
3. Conflict policy: last-write-wins per entry (single author per journey makes
   conflicts rare).

**Photos**
- Resize/compress on device before upload (e.g. long edge 2048px, JPEG ~0.8)
  to save bandwidth on weak connections; generate a thumbnail.
- Strip EXIF GPS from public images unless the user opts in (privacy).

## 4. Privacy & safety considerations
- Publishing a solo hiker's real-time location is a safety risk. Options:
  posting delay (e.g. public view lags 24–48h), fuzzing the latest point, or
  hiding the most recent N entries' exact locations from non-followers.
- Per-journey visibility; ability to hide individual entries' locations.

## 5. Milestones

| # | Milestone | Outcome |
|---|---|---|
| 0 | Project scaffold | Expo app, TS, lint/format, CI, Supabase project + migrations |
| 1 | Auth & profiles | Sign up/in, profile editing |
| 2 | Journeys CRUD | Create/list/edit journeys |
| 3 | Entries (online) | Create entry with text + photos + GPS/time; timeline view |
| 4 | Map view | Polyline + markers, marker → entry detail |
| 5 | Offline-first | Local SQLite store, outbox sync, retry |
| 6 | Sharing | Visibility settings, browse public journeys, share links |
| 7 | Polish & beta | Privacy delay, error states, TestFlight / Play internal testing |

## 6. Testing strategy
- Unit tests (Jest) for sync queue, polyline building, validation.
- Supabase migrations + RLS policy tests against a local Supabase instance.
- Component tests with React Native Testing Library; E2E later (Maestro/Detox).

---

## 7. Open questions

**Scope & platform**
1. **Offline**: Is offline entry creation (sync later) a must for the first version? Trails often have no signal; this is the biggest architectural driver.
2. **Platforms**: iOS + Android both? Is a web viewer (for family/friends without the app) wanted in v1?
3. **Stack preferences**: OK with React Native/Expo + Supabase? Any language, cloud, or budget constraints (e.g. existing AWS/GCP/Firebase usage, Flutter or native preference)?
4. **POC vs. product**: Is this a proof-of-concept to validate the idea (cut corners, single user) or the foundation for a production app?

**Journeys & entries**
5. Can a journey have **multiple authors** (hiking partners/groups), or is it always one hiker?
6. Is **location required** on every entry, or can it be omitted/approximate (e.g. writing at home after the hike)? Should users be able to drag the pin to correct it?
7. Should entries be able to use a **photo's EXIF location/time** instead of the phone's current position?
8. Limits: max photos per entry? Any **video** support?
9. Should a journey be linked to a **known trail** (AT, PCT, PNT…) from day one, with the official route drawn under the hiker's line, or is the entry-to-entry line enough for MVP?
10. Should the line between entries be **straight segments**, or do you want optional **continuous GPS tracking** for an accurate path (much heavier on battery)?

**Social & privacy**
11. **Visibility**: public / unlisted / private per journey — anything else (followers-only)?
12. **Social features** in v1: following, feed, comments, likes — or just shareable journeys?
13. **Safety**: should public location be delayed or fuzzed for the most recent entries?
14. **Discovery**: browse/search journeys by trail or by year (e.g. "PCT 2027 class")?

**Other**
15. Is "Sojourn" the app name? Any branding/design direction?
16. Monetization, moderation, or data-export requirements to plan for?
