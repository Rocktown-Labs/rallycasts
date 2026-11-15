# RallyCasts

<div align="center">
  <h3>Pickleball, told from the courtside</h3>
  <p>Discover players, follow local courts, watch creators, compete in events, and build a pickleball community around every match.</p>
</div>

[RallyCasts](https://rallycasts.com)

---

## 1. Product Overview

**RallyCasts** is a pickleball community and live media platform. It connects players and organizers with video creators and local courts through player discovery, social features, tournaments, match challenges, and live or recorded coverage.

The application includes a web experience, a player mobile app, a dedicated caster mobile app, and a Cloudflare API. Tournament registration and creator payments use Stripe Connect; live video and replay publishing use Mux.

## 2. System Architecture & Technology

```text
Web (TanStack Start)      Player app (Expo)      Caster app (Expo)
        └────────────────────┬──────────────────────┘
                             │
                       Hono API
                             │
      ┌──────────────┬───────┼───────────────┬──────────────┐
      ▼              ▼       ▼               ▼              ▼
 Cloudflare D1   Durable Objects  Queues/Cron   Mux       Stripe Connect
      │              │
 Drizzle ORM    Live/session state
```

| Layer | Technologies |
| --- | --- |
| Web | React, TanStack Start, TanStack Router, Tailwind CSS |
| Mobile | Expo / React Native: player app and caster app |
| API | Hono on Cloudflare Workers |
| Database | Cloudflare D1 with Drizzle ORM |
| Realtime and jobs | Durable Objects, queues, and scheduled work |
| Video | Mux uploads, RTMPS live streams, webhooks, and replay publishing |
| Payments | Stripe Connect hosted onboarding and destination charges |
| Location | RallyCasts venue data, Google Places, and Radar |
| Workspace | Bun, Turborepo, shared UI package |

## 3. Product Capabilities

### Players and local discovery

- Build a player profile and discover nearby players.
- Connect with friends, message players, and receive in-app or push notifications.
- Browse nearby parks and courts using venue information and location-aware ranking.
- Find videos by player, venue, tags, and related content.

### Video, creators, and live coverage

- Upload video directly to Mux from Creator Studio.
- Start RTMPS live streams and publish the completed recording as a replay.
- Browse public live watch pages and a courtside live directory.
- Manage stream publishing and processing status from the Studio.
- Publish short clips and review first-party view, watch-time, follower, and daily audience analytics.
- Keep ingest credentials owner-only in Creator Studio.

### Events and competition

- Create free or paid tournaments with single-elimination or round-robin brackets.
- Seed participants, assign courts, score matches, and notify participants of updates.
- Use player-to-player match challenges with a park, court, schedule, optional caster, split-payment preference, and caster tip.
- Register for paid events through Stripe Checkout; registration confirmation is driven by a verified Stripe webhook.
- Support organizer teams, organization profiles, and organization-authored posts and videos.

### Onboarding and notifications

Guided onboarding collects player details, roles, game preferences, and a home court. The mobile apps can register Expo push tokens for notifications such as court calls, tournament results, challenges, and messages. Push registration is optional; other notification paths continue when push credentials are not configured.

## 4. Monorepo Structure

```text
rallycasts/
├── apps/
│   ├── web/                 # Public site, player community, events, and Creator Studio
│   ├── native/              # Player mobile app
│   ├── caster/              # Caster and streaming mobile app
│   └── server/              # Hono API, routes, jobs, and Durable Objects
├── packages/
│   ├── auth/                # Better Auth configuration
│   ├── db/                  # Drizzle schema and D1 migrations
│   ├── infra/               # Alchemy Cloudflare resources
│   ├── ui/                  # Shared shadcn/ui primitives and styles
│   └── config/              # Shared workspace configuration
└── scripts/                 # Development and end-to-end test support
```

## 5. Local Development

### Prerequisites

- Bun 1.3.10
- Xcode for local iOS builds or Android Studio for local Android builds

Install the workspace and start the web/API development environment:

```bash
bun install
bun run dev
```

The web app runs at `http://localhost:3001` and the API at `http://localhost:3000`. Alchemy provisions the local D1 database and applies migrations during development and deployment.

Build the native development clients when native dependencies change, then start Metro:

```bash
bunx turbo -F native ios
bunx turbo -F native android
bunx turbo -F native dev
```

Use `caster` in place of `native` for the streaming app. Physical devices without a local toolchain can use EAS development builds. Expo Go must match the project's SDK.

## 6. Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start web and API development |
| `bun run dev:web` / `bun run dev:server` | Start one web or API workspace |
| `bun run dev:native` / `bun run dev:caster` | Start one native app |
| `bun run build` | Build the configured workspaces |
| `bun run check-types` | Run workspace TypeScript checks |
| `bun run test` | Run configured tests |
| `bun run e2e` | Run Playwright end-to-end tests |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run deploy` | Deploy the default Alchemy stage |
| `bun run deploy:prod` | Deploy the production stage |
| `bun run destroy` | Remove the selected Alchemy stage |

## 7. Deployment Notes

Production infrastructure is defined in `packages/infra/alchemy.run.ts`. Deployments provision the web app, Hono API, D1 migrations, queues, Durable Objects, and configured Google Places, Radar, Mux, and R2 bindings.

Paid tournaments and Connect payments require Stripe credentials. Live video requires Mux credentials and a configured Mux webhook. Push registration requires an Expo project ID in each mobile app; server-side push security may also require an Expo access token. Keep all credentials in deployment secrets and local environment files, never in source control.

See the [Cloudflare / Alchemy deployment guide](https://www.better-t-stack.dev/docs/guides/cloudflare-alchemy) for the shared deployment workflow.

## 8. Quality Checks

```bash
bun run check
bun run check-types
bun run test
bun run build
```

<div align="center">
  <sub>Built for players, organizers, and creators who bring pickleball to life.</sub>
</div>
