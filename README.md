# rallycaststv

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Start, Hono, and more.

## Features

- **Player discovery** - Profiles, nearby players, friendships, messaging, and notifications
- **Location-aware Trending** - Nearby parks from RallyCasts venue data and Google Places, ranked by distance
- **Video discovery** - Cursor-paginated RallyCasts, player tags, venue metadata, comments, and related videos
- **Creator Studio** - Direct Mux uploads, processing status, publishing controls, and short clips
- **Organizations** - Independent organizer profiles, role-based teams, organization-authored posts/videos, and verified RallyCasts identity
- **Tournaments** - Free or paid registration, seeded single-elimination or round-robin brackets, court assignments, match scoring, notifications, and refunds
- **Match challenges** - Player-to-player challenges with park, court, schedule, optional caster, split-pay preference, and caster tip
- **Stripe Connect** - Accounts v2 hosted organizer onboarding and Checkout destination charges with a configurable platform fee
- **Guided onboarding** - Multi-step player, role, game, and home-court setup
- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **React Native** - Build mobile apps using React
- **Expo** - Tools for React Native development
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Hono** - Lightweight, performant server framework
- **workers** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **Cloudflare D1** - Database engine
- **Authentication** - Better-Auth
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses Cloudflare D1 (SQLite) with Drizzle ORM.

Runtime database access uses the Cloudflare `DB` binding from `packages/infra/alchemy.run.ts`. If a local `DATABASE_URL` is present, it is only for database tooling.

Alchemy provisions the D1 database and applies migrations during `dev` and `deploy`.

1. Generate migration files:

```bash
bun run db:generate
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application. The API is running at [http://localhost:3000](http://localhost:3000).

### Mobile development

`apps/native` and `apps/caster` use Expo SDK 57 with a development build, so they are not tied to the Expo Go version installed on your device. Build the client once per native dependency change:

```bash
bunx turbo -F native ios        # local build, requires Xcode
bunx turbo -F native android    # local build, requires Android Studio
bunx turbo -F native dev        # Metro; the dev client connects automatically
```

Swap `native` for `caster` for the streaming app. Physical devices without a local toolchain can use `bunx eas-cli build --profile development --platform ios` (or `android`) instead. Expo Go must match the project SDK (57); start it with `--go`.

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
import { Button } from "@rallycaststv/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Deployment (Cloudflare via Alchemy)

- Target: web + server
- Dev: bun run dev
- Deploy: bun run deploy
- Production deploy: bun run deploy:prod
- Destroy: bun run destroy

Production deployments provision the web app, Hono API, D1 migrations, queues, Durable Objects, and configured Google Places, Radar, Mux, and R2 bindings through `packages/infra/alchemy.run.ts`.

The production `CLOUDFLARE_API_TOKEN` GitHub secret must permit the documented R2 bucket/custom-domain operations and zone lookup for `rallycasts.com`. The deployment verifies that `media.rallycasts.com` is active and has an authoritative DNS record, reports public resolver propagation, and reattaches the documented R2 custom domain if the authoritative record is missing. It also performs a unique put/fetch/content comparison through the custom domain and deletes the smoke-test object. Do not replace it with a manual `r2.dev` CNAME.

Paid tournaments require `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Connect onboarding and payment confirmation remain unavailable when those bindings are absent; registrations are confirmed only by a verified webhook.

For more details, see the guide on [Deploying to Cloudflare with Alchemy](https://www.better-t-stack.dev/docs/guides/cloudflare-alchemy).

## Testing, Git Hooks, and Formatting

- Format code: `bun x ultracite fix`
- Check formatting and lint: `bun run check`
- Run all package tests: `bun run test`
- Check TypeScript types: `bun run check-types`
- Run the production build: `bun run build`

## Project Structure

```
rallycaststv/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Start)
│   ├── native/      # Mobile application (React Native, Expo)
│   └── server/      # Backend API (Hono)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run test`: Run all configured test suites
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run dev:native`: Start the React Native/Expo development server
- `bun run db:generate`: Generate database client/types
- `bun run check`: Run Oxlint and Oxfmt
- `bun run deploy:prod`: Deploy the production Cloudflare stack
