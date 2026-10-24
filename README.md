# Sojourn

Trail journals for long-distance hikers. A **journey** is a collection of journal
**entries** (text and/or up to 5 photos), each with a timestamp and a location.
A journey's entries are joined in time order and drawn on a map as one line,
whichever co-author wrote them.

This is a proof of concept. Product decisions and the roadmap live in
[`docs/PLAN.md`](docs/PLAN.md).

## What's in the POC

- **Journeys** on any trail, labelled with free-form tags (`#at`, `#AppalachianTrail`, …)
- **Entries** with text + photos, GPS or photo-EXIF location/time, and editable location
- **Safety delay**: entries are hidden from everyone except the journey's authors
  until the delay passes (24h by default), so a post never reveals where a hiker is
  right now. Authors can publish an entry immediately after a warning. Enforced
  server-side; photos are EXIF-stripped before upload.
- **Co-authors**: the owner invites hikers, who must accept before posting
- **Follow + feed**, with per-profile privacy (open / approve followers / private)
- **Explore** journeys by tag, search hikers
- **Offline-first on mobile**: new entries go to an on-device outbox and sync when
  there's signal
- **Web** (TanStack Router + MapLibre) and **iOS/Android** (Expo + react-native-maps)

## Project structure

```
apps/
  web/        React + TanStack Router web app (MapLibre maps)
  native/     Expo + Unistyles app for iOS/Android (offline outbox in lib/outbox.tsx)
packages/
  backend/    Convex functions, schema, Better Auth, geospatial index, tests
    convex/lib/  shared pure helpers (tags, map paths, constants) also used by the apps
  ui/         shared shadcn/ui primitives + theme tokens for web
docs/PLAN.md  product plan and decisions
```

## Getting started

```bash
bun install
bun run dev:setup          # create/connect a Convex deployment (writes packages/backend/.env.local)
```

Set the Convex environment variables Better Auth needs:

```bash
cd packages/backend
npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
npx convex env set SITE_URL http://localhost:3001
```

Copy your deployment URLs into the apps (`apps/web/.env`, `apps/native/.env`):

```
VITE_CONVEX_URL=https://<deployment>.convex.cloud
VITE_CONVEX_SITE_URL=https://<deployment>.convex.site
EXPO_PUBLIC_CONVEX_URL=https://<deployment>.convex.cloud
EXPO_PUBLIC_CONVEX_SITE_URL=https://<deployment>.convex.site
```

Then:

```bash
bun run dev                # Convex + web (http://localhost:3001) + Expo
```

The native app uses native modules (maps, Unistyles, image manipulation), so run it
in a development build: `bun run ios` / `bun run android` from `apps/native`.

> `packages/backend/convex/_generated` was written by hand to match Convex codegen
> (no deployment was available when it was scaffolded). The first `convex dev`
> regenerates it — commit the result.

## Checks

```bash
bun run check-types        # all packages
bun run test               # Convex function tests (convex-test + vitest)
```

## Notes

- Map tiles come from [OpenTopoMap](https://opentopomap.org) (CC-BY-SA). Their
  servers are for light use; switch to a hosted tile provider before a real launch.
- Android release builds of `react-native-maps` need a Google Maps API key.

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@sojourn/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Environment Configuration

Each app owns its environment schema in `.env.schema`. Varlock generates `src/env.ts` during installation; run `bun run env:generate` after changing a schema. Commit schemas, and keep secrets in ignored env files or your deployment platform.

Import the generated `ENV` accessor in application code. Shared database and auth packages receive configuration or initialized clients from the application. See [Varlock's monorepo guide](https://varlock.dev/guides/monorepos/).

Bun's automatic env loading is disabled in `bunfig.toml`; the framework integration or server bootstrap loads Varlock. Node deployments must include Varlock and its dependencies alongside the app schema.

Run standalone Node/Bun tools that use Varlock from the owning app directory so they load that app's schema and env files. `env:generate` only generates TypeScript files; it does not initialize environment values in a subsequent command.

## Deployment

### Docker Compose

- Target: web
- Config: `docker-compose.yml` (app Dockerfiles live in `apps/*/Dockerfile`)
- Build images: bun run docker:build
- Start: bun run docker:up
- Logs: bun run docker:logs
- Stop: bun run docker:down

Environment variables are read from each app's `.env` file (baked into web builds for public variables) and overridden in `docker-compose.yml` for container networking.

For more details, see the guide on [Deploying with Docker Compose](https://www.better-t-stack.dev/docs/guides/docker).

## Project Structure

```
sojourn/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   ├── native/      # Mobile application (React Native, Expo)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── backend/     # Convex backend functions and schema
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:setup`: Setup and configure your Convex project
- `bun run check-types`: Check TypeScript types across all apps
- `bun run dev:native`: Start the React Native/Expo development server
- `bun run docker:build`: Build the Docker Compose images
- `bun run docker:up`: Build and start the Docker Compose stack
- `bun run docker:logs`: Tail logs from the Docker Compose stack
- `bun run docker:down`: Stop the Docker Compose stack
