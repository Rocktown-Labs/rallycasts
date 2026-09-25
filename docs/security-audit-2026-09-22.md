# Security Audit — RallyCasts

**Date:** 2026-09-22
**Scope:** Full monorepo (`apps/server`, `apps/web`, `apps/native`, `apps/caster`, `packages/*`), dependency audit (`bun audit`), git history check for committed secrets. Findings re-verified against HEAD `34c8ee1`.
**Method:** Manual review of all server routes/middleware, auth config, webhook handlers, uploads, Durable Objects/realtime auth, client apps, plus automated dependency scanning.

---

## Executive Summary

The codebase has a **strong security foundation** in several areas: all four webhooks verify HMAC signatures (Stripe, Mux, Radar, Resend/svix), Stripe checkout/refunds are correctly scoped to the authenticated user with server-derived prices, uploads validate magic bytes with server-generated keys, Durable Object WebSockets require signed resource-bound tokens, SQL is fully parameterized (no injection), no XSS sinks, no committed secrets, and mutations are CSRF-hardened via origin checks.

However, there are **two critical issues and several high/medium issues** that should be fixed before public launch:

1. **Ad budget can be drained by anyone** — unauthenticated, unsigned impression/click endpoints.
2. **No rate limiting exists anywhere** — several unauthenticated endpoints trigger paid third-party API calls (Google Places, Gemini embeddings) per request.
3. **Tournament integrity** — a logged-in participant can fabricate scores, declare themselves the winner, and complete any tournament they're registered in via a demo endpoint left open in prod.
4. **Account takeover prerequisite** — OAuth account linking is configured to trust unverified local accounts.

**Dependency scan:** 3 advisories (1 high, 2 moderate), all in dev tooling (Playwright, Vitest) — no runtime vulnerabilities. No secrets in git history.

| Severity   | Count |
| ---------- | ----- |
| Critical   | 2     |
| High       | 3     |
| Medium     | 10    |
| Low / Info | 7     |

---

## Remediation Status (2026-09-23)

All **P0 items are fixed** on `feat/home-youtube-layout-venue-slugs-desktop` (PR #51):

1. **C1** — `POST /ads/impressions` and `/ads/clicks` now reject unsigned requests; they require the HMAC-signed beacon params (`c`, `cr`, `exp`, `sig`) issued with sponsored payloads via the new `signDisplayTracking` helper, attached as `adTracking` to sponsored results in feed, search, and trending. (`apps/server/src/routes/ads.ts`, `apps/server/src/lib/ads.ts`)
2. **C2** — Rate limiting added via Cloudflare rate-limit bindings: a baseline 600 req/min per client on `/api/v1/*`, and a strict 60 req/min tier on `/api/auth/*`, `/api/v1/search`, `/api/v1/places/*`, `/api/v1/trending`, and `/api/v1/profile/check-username`. (`apps/server/src/middleware/rate-limit.ts`, `apps/server/src/index.ts`, `packages/infra/alchemy.run.ts`)
3. **H1/M2/M3** — `seed-demo` and `advance-demo-round` return 404 unless the `ALLOW_DEMO_ENDPOINTS` binding is set (never in prod); `test-notification` now requires event management rights via `getManageableEvent`. (`apps/server/src/routes/events.ts`)
4. **H2** — `requireLocalEmailVerified: true` in `packages/auth/src/index.ts`.
5. **H3** — `verifyBeaconParams` now uses constant-time `crypto.subtle.verify` instead of a hand-rolled byte loop. (`apps/server/src/lib/ads.ts`)

## P1/P2 items remain open.

## Critical

### C1. Unauthenticated ad event ingestion allows arbitrary budget drain

**Files:** `apps/server/src/routes/ads.ts:245-291`, `apps/server/src/routes/ads.ts:1002-1030`, `apps/server/src/lib/ads.ts:94-104`

`POST /api/v1/ads/impressions` and `POST /api/v1/ads/clicks` require no authentication and no signature. Validation (`validateDisplayBeacon`) only checks that `campaignId` + `creativeId` reference an **active** campaign/creative:

```ts
// routes/ads.ts:253
const decision = await validateDisplayBeacon(db, body); // no auth, no HMAC
await enqueueAdEvent(c, c.env, db, { ... kind: "impression", ... });
```

Spend is computed as `floor(impressions × cpm / 1000)` (`lib/ads.ts:94-95`). The unauthenticated `GET /api/v1/ads/vast` returns campaign/creative IDs to anyone, so an attacker can fetch a live campaign's IDs and then replay `POST /impressions`/`POST /clicks` in a loop to exhaust the advertiser's prepaid budget — classic click/impression fraud. This also runs through the queue, so it burns queue/worker capacity too.

Contrast: the VAST `/beacon` endpoint does verify an HMAC signature (`ads.ts:203-243`); the display endpoints don't.

**Fix:** Sign display beacons the same way as VAST beacons (serve an HMAC-signed token to the client at ad decision time), or require a viewer session/IP-based token; at minimum add per-IP/UA deduplication and rate limiting.

### C2. Zero rate limiting + unauthenticated paid-API proxies (cost abuse / DoS)

**Files:** `apps/server/src/routes/search.ts:41,68-79`, `apps/server/src/routes/places.ts:16,45,75,139-170`, `apps/server/src/routes/trending.ts:365-478`, `apps/server/src/routes/profile.ts:293-296`

There is **no rate limiting anywhere in the server** (no limiter middleware, no Cloudflare WAF config in `wrangler.jsonc`). Combined with these unauthenticated surfaces:

- `GET /api/v1/search?q=…` — triggers a **paid Gemini embedding call + Vectorize query + ~10 D1 queries per request**, anonymously.
- `GET /api/v1/places/search|nearby|details/:placeId` — open proxy to **billed Google Places API**. Worse, `GET /places/:id` performs an **unauthenticated DB write** (`findOrCreateVenueFromGooglePlace`) on cache miss — an attacker can flood the `venue` table and burn the Places quota simultaneously.
- `GET /api/v1/trending` — Google Places fetch + full-table haversine scans, anonymous.
- `GET /api/v1/profile/check-username` — loads **every user row into memory** per call (`profile.ts:293-296: db.select(...).from(user).all()`), trivially amplifiable.

Additionally, better-auth's own rate limiter is unconfigured (`packages/auth/src/index.ts`) and its default is **in-memory storage, which is per-isolate on Cloudflare Workers** — brute-forcing `/api/auth/sign-in` and password reset is effectively unthrottled.

**Fix:** Add per-IP rate limiting (Workers KV/DO-based, e.g. the Workers rate-limiting binding or a DO limiter) globally and per-endpoint; require auth (or stricter limits) on Places/search/trending; configure better-auth `rateLimit` with persistent storage.

---

## High

### H1. `POST /events/:id/advance-demo-round` is reachable in prod — participants can fabricate results

**Files:** `apps/server/src/routes/events.ts:1327-1404`, `606-860`

The endpoint requires only `requireAuth` plus "is a player in a match of this event". It then fabricates scores, sets `winnerUserId = authUser.id`, auto-completes all sibling matches, and flips the event status to `completed`:

```ts
// events.ts:616-621
playerOneScore: currentMatch.playerOneUserId === authUser.id ? 11 : 7,
...
winnerUserId: authUser.id,
status: "completed",
```

On a real (paid) tournament, any registered player can self-declare champion and corrupt the bracket. There is no demo/environment gate.

**Fix:** Gate the entire demo trio (`/seed-demo` at `events.ts:1267`, `/test-notification` at `events.ts:1290`, `/advance-demo-round`) behind an environment flag (e.g. `IS_DEMO_ENV`) or event-level `isDemo` column, and remove `winnerUserId: authUser.id` server-side assignment.

### H2. OAuth account linking trusts unverified local accounts (pre-account-takeover setup)

**File:** `packages/auth/src/index.ts:98-103`

```ts
account: {
  accountLinking: {
    enabled: true,
    requireLocalEmailVerified: false,   // ← the problem
    trustedProviders: ["google", "github"],
  },
},
```

An attacker can password-register `victim@example.com` (never verifying), and later the real owner (or anyone controlling an OAuth identity at that address, e.g. a GitHub org email) will have their OAuth identity **linked into the attacker's pre-created account**. better-auth explicitly recommends `requireLocalEmailVerified: true`.

**Fix:** Set `requireLocalEmailVerified: true`.

### H3. Timing-unsafe manual signature comparison in ad beacons

**File:** `apps/server/src/lib/ads.ts:322-326`

```ts
for (let index = 0; index < actualBytes.length; index += 1) {
  if (actualBytes[index] !== expectedBytes[index]) {
    return false;
  }
}
```

`verifyBeaconParams` returns on the first mismatching byte, creating a position-observable timing oracle over attacker-chosen payload bytes (`c`, `cr`, `p`, `ev`, `exp`) — beacon signatures are theoretically forgeable byte-by-byte. Every other webhook uses constant-time `crypto.subtle.verify`.

**Fix:** Replace with `crypto.subtle.verify` (or a branchless digest compare like the e2e endpoint already does in `routes/e2e.ts:31-48`).

---

## Medium

| #   | Finding                                                                                | Location                                                                                                                   | Notes / Fix                                                                                                                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Org `admin` (non-owner) can attach/replace `organization.stripeAccountId`              | `apps/server/src/routes/stripe.ts:397-439`                                                                                 | Destination charges pay out to that account, so a rogue org admin added by the owner can redirect **all future event payouts** to their own Stripe account. Restrict Connect onboarding to role `owner`.                                                                                 |
| M2  | `POST /events/:id/test-notification` — no ownership check                              | `apps/server/src/routes/events.ts:1290-1326`                                                                               | Any authenticated user can fire platform-branded Resend emails / DO notifications against any event ID. Add `getManageableEvent`.                                                                                                                                                        |
| M3  | `POST /events/:id/seed-demo` — no prod gate for organizers                             | `apps/server/src/routes/events.ts:1267-1289`                                                                               | Wipes real registrations/matches and inserts demo users on a real event. Gate on environment/demo flag.                                                                                                                                                                                  |
| M4  | E2E seed endpoint runs in prod whenever `E2E_SEED_TOKEN` is set                        | `apps/server/src/routes/e2e.ts:80-89`, `:61-64`                                                                            | Token gate fails closed and compares via SHA-256 digest (good), but if the token ever leaks, `ensureUser` **forces `emailVerified: true`** on an arbitrary existing email and seeds an organizer account. Add an explicit non-prod environment flag; never force-verify existing emails. |
| M5  | Casting job status transitions unvalidated                                             | `apps/server/src/routes/casting-jobs.ts:108-131`                                                                           | Either requester or caster can set any status (`completed`, `failed`…). Add a role-based transition matrix.                                                                                                                                                                              |
| M6  | Mux uploads created with `"public"` playback policy regardless of video visibility     | `apps/server/src/routes/upload.ts:134`                                                                                     | Private/friends videos are publicly playable via playback ID between upload and the `asset.ready` webhook flip. Create with `signed`, flip to `public` at ready for public videos.                                                                                                       |
| M7  | Missing `MUX_SIGNING_KEY_*` **permanently downgrades** private videos to public        | `apps/server/src/routes/videos.ts:892-926`                                                                                 | An owner viewing their own private video triggers `replaceMuxAssetPlaybackPolicy(..., "public", ...)` when signing keys are unconfigured. Fail closed instead of auto-public.                                                                                                            |
| M8  | Localhost origins unconditional in production                                          | `apps/server/src/index.ts:57-81` (CORS), `packages/auth/src/index.ts:147-149` (trustedOrigins), `:146` (`exp://` wildcard) | `http://localhost:3001` / `127.0.0.1:3001` always allowed with credentials; `exp://` matches any LAN Metro dev URL. Gate all dev origins on an env flag; pin `rallycaststv://` only.                                                                                                     |
| M9  | Social DMs/shares: no friendship requirement → notification/DM spam to arbitrary users | `apps/server/src/routes/social.ts:661-741`, `:917-1007`                                                                    | Any authed user can start a conversation with and spam notifications to any `userId`. Require friendship for new conversations, cap shares.                                                                                                                                              |
| M10 | `BETTER_AUTH_SECRET` reused for ad-beacon HMAC + viewer hashing                        | `apps/server/src/routes/ads.ts:166-178, 225, 230`                                                                          | Cross-purpose secret reuse: any leak in the ad path compromises the auth secret. Use a dedicated `AD_BEACON_SECRET`.                                                                                                                                                                     |

---

## Low / Informational

| #   | Finding                                                                                                                                                                                                                                                                                             | Location                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| L1  | Auth cookie scoped to entire parent domain `.rallycasts.com` — XSS/takeover of any subdomain (e.g. staging/preview hosts) captures sessions. Cookie flags themselves are correct (httpOnly, lax, secure-in-prod).                                                                                   | `packages/auth/src/index.ts:105-111`                                               |
| L2  | `_auth` route protection is client-side only (`ssr: false`, `beforeLoad` via client `authClient`) — not server-enforced. Mitigated because all data comes from `requireAuth` API routes; defense-in-depth debt only. `apps/web/src/middleware/auth.ts` + `src/functions/get-user.ts` are dead code. | `apps/web/src/routes/_auth/route.tsx:9-60`                                         |
| L3  | Draft/uploading/processing videos with `visibility="public"` are readable via `GET /videos/:id` before publish.                                                                                                                                                                                     | `apps/server/src/routes/videos.ts:740-748`                                         |
| L4  | Public event participant roster (registered players' names) for any published event.                                                                                                                                                                                                                | `apps/server/src/routes/events.ts:1046-1082`                                       |
| L5  | Weak default password policy (better-auth default min 8, no complexity).                                                                                                                                                                                                                            | `packages/auth/src/index.ts:118-123`                                               |
| L6  | `me.tsx:1072` uses `rel="noopener"` without `noreferrer`; Mux thumbnail URL built by raw interpolation (DB-sourced value, not user input). Hygiene only.                                                                                                                                            | `apps/web/src/routes/_auth/u/me.tsx`, `apps/web/src/routes/videos.$id.tsx:613-614` |
| L7  | Geolocation coordinates persisted indefinitely in `localStorage`.                                                                                                                                                                                                                                   | `apps/web/src/lib/hooks/use-geolocation.ts:83-129`                                 |

**Dev tooling dependencies (`bun audit`):**

- **High** — `playwright <1.55.1`: browser download doesn't verify SSL certificates (GHSA-7mvr-c777-76hp). Update `@playwright/test` to ≥1.55.1. Dev-only.
- **Moderate ×2** — `vitest` / `@vitest/mocker` 2.1.0–4.1.11: path traversal / arbitrary file read via redirect mock (GHSA-82fw-gwwq-j7x9). Update vitest to ≥4.1.11. Dev-only; does not affect the deployed Worker.
- **No vulnerabilities in runtime production dependencies.**

---

## Verified Secure (important negatives)

- **Webhooks:** Stripe (`stripe.ts:731-746`, 300s timestamp window), Mux (`mux.ts:258-274`), Radar (`webhooks.ts:155-181`), Resend/svix (`webhooks.ts:241-284`) — all verify signature **before** processing, all fail closed when secret is missing, all constant-time. Stripe checkout processing additionally re-validates amount (`paidAmountCents !== entryFeeCents → reject`), payment status, and registration linkage, so forged events can't credit a registration anyway.
- **Payments ownership:** checkout keyed to `authUser.id`, prices derived server-side from the event record, idempotency keys per registration; refunds join on `eventRegistration.userId = authUser.id` + `paid` + `succeeded` with deadline and idempotency.
- **Authorization model:** videos, casting jobs, challenges, events, orgs, ad campaigns, conversations all scope mutations to owner/org membership **in the SQL WHERE clause** — no IDOR found on those paths.
- **Admin:** real `platformRole === "admin"` DB check + `emailVerified` (`admin.ts:26-37`); `platformRole` is not settable via profile PATCH; ad review/search backfill/emails are admin-gated.
- **Uploads:** auth + verification required, content-type allowlist, 5MB limit, magic-byte validation, server-generated storage keys (`images/${crypto.randomUUID()}`) — no path traversal.
- **Realtime:** ChatRoom/UserNotifications DOs require signed JWTs bound to `BETTER_AUTH_SECRET`, `exp`, and `resourceId`; tokens issued only after membership checks server-side.
- **Injection/XSS/SSRF:** all Drizzle `sql\`` usage binds values; no `dangerouslySetInnerHTML`/`innerHTML`/`eval`; no user-controlled fetch URLs (all third-party clients use hardcoded hosts; ad media URLs restricted to `stream.mux.com`/`media.rallycasts.com`).
- **CSRF/CORS:** `protectMutations` validates Origin/Referer + `Sec-Fetch-Site` on mutations; CORS is a strict allowlist (not reflected) with `credentials: true`.
- **Secrets:** no `.env`/`.pem`/`.key` committed, nothing sensitive in git history (`git grep` at HEAD clean); no `Math.random` for security; no console logging of env/headers/bodies; native apps store tokens in `expo-secure-store` and expose only `EXPO_PUBLIC_SERVER_URL`.

---

## Remediation Roadmap

**Before launch (P0):**

1. Sign display ad beacons or auth-gate impression/click ingestion (C1).
2. Add rate limiting: global per-IP limiter + strict limits on `search`, `places/*`, `trending`, `profile/check-username`, better-auth limiter with persistent storage (C2).
3. Gate `seed-demo` / `advance-demo-round` / `test-notification` behind an environment or event `isDemo` flag (H1, M2, M3); stop server-assigning `winnerUserId: authUser.id`.
4. `requireLocalEmailVerified: true` in account linking (H2).
5. Replace manual beacon byte-loop with `crypto.subtle.verify` (H3).

**P1:** 6. Restrict Stripe Connect onboarding to org `owner` role (M1). 7. Mux: create uploads `signed`; remove auto-public downgrade on missing signing keys (M6, M7). 8. Gate localhost dev origins/trustedOrigins + remove `exp://` wildcard in prod (M8). 9. Dedicated `AD_BEACON_SECRET` (M10). 10. Friendship requirement for new DM conversations (M9).

**P2:** 11. Casting-job status transition matrix (M5). 12. E2E seed: explicit non-prod env gate + never force-verify existing emails (M4). 13. Dependency bumps: `@playwright/test` ≥1.55.1, `vitest` ≥4.1.11. 14. Cookie domain scoping, password policy, draft-video visibility, dead-code cleanup (L1–L7).

---

## Remediation Status — P1/P2 (2026-09-25)

All P1/P2 items are fixed on `fix/security-p1-p2-remediations`:

**P1**

- **M1** — Stripe Connect onboarding now requires role `owner` (was any non-editor); error message calls out payout management. (`apps/server/src/routes/stripe.ts`)
- **M6** — Mux uploads are created with `signed` playback policy for non-public videos; public videos are flipped to public by the existing `asset.ready` webhook. (`apps/server/src/routes/upload.ts`)
- **M7** — Removed the auto-upgrade-to-public fallback in `GET /videos/:id/playback`; missing signing keys now fail closed with 503. (`apps/server/src/routes/videos.ts`)
- **M8** — `localhost`/`127.0.0.1` CORS origins and `exp://` + localhost better-auth `trustedOrigins` are only applied when the server env is local (`BETTER_AUTH_URL` or `CORS_ORIGIN` contains localhost); `rallycaststv://` stays pinned. Shared `isLocalEnv` helper in `apps/server/src/lib/admin.ts`, also guarding `exp://` in `isConfiguredOrigin` (mutation/websocket CSRF checks).
- **M10** — New optional `AD_BEACON_SECRET` binding (Alchemy + deploy workflow) used for beacon sign/verify and viewer hashing via `adsSecret()`; falls back to `BETTER_AUTH_SECRET` when unset. Operators should set a dedicated value in prod (rotating it invalidates beacons ≤24h old).
- **M9** — Starting a conversation or sharing directly to a recipient now requires an accepted friendship (403 otherwise); covered by a new non-friend 403 test. (`apps/server/src/routes/social.ts`)

**P2**

- **M5** — Role-based casting-job transition matrix (requester: draft→requested/cancelled etc.; caster: accepted→arrived→recording→uploading→completed; terminal states locked; same-status restatement is a no-op 200; non-parties get 404). New `casting-jobs.test.ts` covers both lifecycles. (`apps/server/src/routes/casting-jobs.ts`)
- **M4** — E2E seed additionally gated on `ALLOW_DEMO_ENDPOINTS` (never set in prod) and no longer touches pre-existing accounts (no more forced `emailVerified`, name kept). Tests updated + added (disabled-flag 404, no-force-verify).
- **#13** — `@playwright/test` 1.55.0→1.55.1, `vitest` ^4.1.8→^4.1.11; `bun audit` reports **zero vulnerabilities** (was 3). Note: `bun install` re-resolved the workspace zod to 4.6.5, which broke better-auth 1.6.22 declaration emit (TS2883 `$strip`), so the catalog pins `zod` to the last green version `4.4.3` until better-auth catches up — dependabot #43 should revisit.
- **L1** — Session cookie parent-domain (`.rallycasts.com`) now only set for the exact hosts `rallycasts.com` / `api.rallycasts.com`, not any `*.rallycasts.com` subdomain.
- **L5** — Password minimum raised 8→12 (`minPasswordLength`, max 128); E2E seed schema aligned to min 12. `STAGING_E2E_PASSWORD` must be ≥12 chars.
- **L3** — `GET /videos/:id` returns 404 for non-`ready` videos unless the requester owns them (session lookup only happens for non-ready videos).
- **L2** — Deleted dead web code: `apps/web/src/middleware/auth.ts`, `apps/web/src/functions/get-user.ts` (nothing imported them).
- **L6** — `rel="noopener noreferrer"` in `me.tsx`; `encodeURIComponent` around Mux playback IDs in thumbnail URLs (4 sites).

**Accepted without code change**

- **L4** — Public event player rosters expose only names/usernames/avatars plus registration metadata (no emails); intentional tournament feature.
- **L7** — Geolocation coordinates persist in the device's own `localStorage` behind the location-consent flow; no exfiltration path, so kept as-is.
