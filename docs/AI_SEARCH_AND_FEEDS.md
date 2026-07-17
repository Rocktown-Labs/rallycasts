# AI search and feed architecture

## Current behavior

RallyCasts uses AI behind product-specific data workflows:

1. Global search uses Gemini Embedding 2 through the shared embedding helper to create 768-dimensional embeddings and Cloudflare Vectorize with cosine similarity.
2. Authenticated Home uses the same embeddings for mixed candidate generation across videos, events, venues, players, and posts, then deterministic application scoring.
3. A future trading-card workflow can use action-photo generation without adding a generic chat interface.

There is no generic AI or chat route.

### Search documents currently produced

| Entity             | Embedded text                           | Metadata                       | Trigger                                  |
| ------------------ | --------------------------------------- | ------------------------------ | ---------------------------------------- |
| Public ready video | Title and description                   | Media type, owner ID, venue ID | Ready upload, public video create/update |
| Post               | Post content and generated author title | Author user ID                 | Post creation                            |
| Published event    | Event title, summary, and venue context | Organizer/user and venue IDs   | Event create/update and paid checkout    |
| Venue              | Park name, address, and city/state      | Venue and Google Place IDs     | Venue enrichment/create/update           |
| Public profile     | Display name, username, and bio         | User ID                        | Profile update or admin backfill         |

Organizations are not currently a search-document entity type. They should be added once organization profiles move beyond route scaffolding into durable public profiles and authored content.

### Search safeguards

- Private, friends-only, draft, processing, failed, and deleted videos are removed from the search-document table and vector index.
- Search results independently require videos to be public and ready and events to be published.
- Vector matches are restored to similarity order after the D1 lookup.
- Embedding status and model are recorded as pending, ready, or failed.
- Keyword search remains the fallback when AI or Vectorize bindings are unavailable.
- The legacy video feed lazily queues missing video embeddings for its first 12 fallback candidates, while `/api/v1/search/backfill` lets a platform admin queue existing profiles, posts, videos, events, and venues in larger batches.

## Fields suitable for feed ranking

These fields may influence recommendations when the user has supplied them or generated the associated behavior:

| Signal group      | Fields/events                                                       | Good uses                                                        |
| ----------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Player intent     | Skill level, bio, player/caster/organizer roles                     | Skill-appropriate clips, clinics, casting, and organizer content |
| Coarse location   | Home city/state, home court or venue ID                             | Nearby parks, events, players, and locally relevant videos       |
| Social graph      | Friendships, followed/tagged players, organization membership       | Content from people and organizations the player knows           |
| Engagement        | Likes, comments, shares, event registrations, challenges            | Topic and creator affinity                                       |
| Content           | Title, description, media type, tagged players, venue, organization | Semantic candidate generation and diversity                      |
| Freshness/quality | Published time, completion rate, hides/reports, playback readiness  | Recency, quality, and safety ranking                             |

The current schema does not store follows, feed impressions, watch time/completion, hides, reports, or explicit content preferences. Those should be added before calling the feed personalized; likes alone create a narrow and easily biased signal.

## Fields that must not be embedded or exposed to Vectorize

- Email, authentication/session data, payment records, Stripe IDs, and account secrets
- Date of birth or exact age
- Precise home latitude/longitude, Radar identifiers, or private presence history
- Direct messages, private/friends-only content, draft content, or private challenge details
- Internal moderation notes or organizer/member audit data

Use coarse location or opaque venue IDs as filters after candidate generation. Do not encode precise coordinates into searchable text or vector metadata.

## Home-feed pipeline

1. **Candidate generation**: fetch semantic matches, nearby public content, friends/organizations, registered-event content, and a trending fallback in parallel.
2. **Hard filters**: enforce visibility, readiness, blocks, age/safety policy, and geographic eligibility before ranking.
3. **Deterministic ranking**: combine semantic relevance (40%), coarse distance (20%), social affinity (15%), freshness (15%), and real likes (10%).
4. **Diversity pass**: cap repeated creators, venues, and content types so one hot account cannot consume the feed.
5. **Explanation**: return a short reason such as “Near your home court,” “Advanced match,” or “From an organizer you follow.”
6. **Measurement**: record impressions, opens, watch time, completion, hides, and registrations with an algorithm version.

The shipped `/api/v1/feed/home` endpoint returns typed mixed items with `reason`, `score`, and normalized signal values. Embeddings do not decide permissions or final order by themselves; they supply the semantic score that is blended with social, location, freshness, and engagement signals.

Do not mix providers in the same live vector corpus. Gemini Embedding 2 vectors are not comparable to older embedding spaces, so existing search documents should be re-embedded with `/api/v1/search/backfill` and verified for the current `embedding_model`.

These are product defaults, not ML truth. Feed impressions, watch completion, hides, and registrations should eventually replace likes as stronger quality signals and make the weights measurable.

## Required next data changes

- Add explicit content preferences and play goals instead of inferring them from a free-form bio.
- Add follows for players and organizations.
- Add feed impressions and video playback progress/completion.
- Add hide/report/not-interested feedback.
- Add `organization` to search entity types.
- Index organizations through the same lifecycle helper.
- Add a resumable backfill job for pending/missing embeddings and model upgrades.
- Add feed algorithm/model version fields so ranking changes can be evaluated and rolled back.

Generative AI should create summaries, labels, moderation assistance, and natural-language explanations. It should not directly decide permissions, payments, tournament outcomes, or the final feed order.
