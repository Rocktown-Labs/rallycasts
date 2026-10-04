# RallyCasts Ads (organizer boosts + Mux prerolls)

Advertisers are **organizations first**. An organizer promotes a published tournament as event cards (trending, search, home feed) and/or skippable video prerolls over Mux content. Billing is **CPM from prepaid budget** (display default $5 CPM, video default $15 CPM, floors enforced in `routes/ads.ts`). Campaigns serve only after **admin approval + funding**.

## Own VAST ad server

`GET /api/v1/ads/vast` is a minimal VAST 4.2 ad server: one preroll `<Linear>` creative per response, IMA-compatible fields only (`Impression`, quartile `TrackingEvents`, `VideoClicks`). Empty VAST when nothing is eligible, so players play content uninterrupted.

- Sponsor media must be a Mux-served progressive MP4 (`isAllowedVastMediaUrl`): preroll creatives reference an existing **public, ready, org-owned Mux video ≤ 30s** — no transcoding pipeline.
- Tracking/click URLs are HMAC-signed (`signBeaconParams`) with `BETTER_AUTH_SECRET` and expire in 24h; `GET /api/v1/ads/beacon` rejects forged or expired pixels.
- Display placements beacon to `POST /api/v1/ads/impressions|clicks`.
- Beacons enqueue to the `ads-events` Queue and fall back to direct aggregation when the binding is absent (tests, local dev).

## Spend accounting

- `aggregateAdEvents` (`lib/ads.ts`) folds events into `ad_daily_stat` buckets; spend per bucket is `floor(impressions * cpm / 1000)` so fractional CPMs never drift. D1 is billing truth; Analytics Engine (`rallycasts_ads`) is best-effort telemetry.
- Campaigns auto-complete when spend reaches `min(totalBudget, funded)`. Daily caps pause serving until the next UTC day.
- Prepaid top-ups go through Stripe Checkout (`POST /api/v1/ads/campaigns/:id/topup`, metadata `type=ad_budget`); the Stripe webhook credits `fundedCents` idempotently (`processAdBudgetCompleted`).

## Targeting and privacy

Coarse signals only: city/state, skill level, venue affinity. Never precise home lat/lng, Radar IDs, DMs, or private content. `decideAds` uses D1 filters only — editorial Vectorize ranking is never consulted, so spend cannot corrupt the semantic index. Sponsored results are appended with `sponsored: true`, never blended into ranked order:

- feed: fixed slots (positions 3 and 12), `reason: "Promoted tournament"`
- search: query-text match, pinned above organic events
- trending: separate `sponsoredEvents` array
- video: preroll via `SponsoredPlayer` (web), skippable after 5s, max 1 creative per VAST response

## Web player (Mux + IMA)

`SponsoredPlayer` renders Mux Player (`@mux/mux-player-react/lazy`) and, on user play, fetches the VAST tag. With an ad, it loads the Google IMA SDK lazily, plays the linear into a dedicated overlay video element, and pauses/resumes content on IMA events. Any ad error, empty VAST, or blocked SDK falls back to content. Mux Data tracks content QoE automatically (`player_name: rallycasts-watch`); ad delivery is verified by our beacons plus the Analytics Engine dataset.

Native apps get display placements only in v1 (IMA HTML5 does not run in Expo Go); the VAST endpoint is reusable when native adopts IMA SDKs.

## Verification

- `bunx vitest run src/routes/ads.test.ts src/lib/ads-vast.test.ts` covers creation guards, approval-requires-funding, VAST shape, beacon forgery rejection, budget exhaustion (including the complete-with-final-spend write), and Stripe top-up settlement.
- Mux-side verification: compare billed impressions against Mux Data engagement (Ad Impressions) and the Analytics Engine dataset.
