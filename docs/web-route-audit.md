# Web Route Audit

Last updated: 2026-07-17

## Active Route Families

- `/`, `/trending`, `/players`, `/players/$username`, `/events`, `/events/$id/*`, `/videos/$id`, `/casters`, `/casters/$id`, `/shop`, `/venues/$id`
- `/events/organizers`, `/events/organizers/$slug`, `/events/organizers/new`, `/events/organizers/$slug/manage`
- `/u`, `/u/me`, `/u/profile`, `/u/settings`, `/u/messages`, `/u/notifications`, `/u/challenges`
- `/u/casts/all`, `/u/casts/new`, `/u/casts/pending`, `/u/casts/approved`, `/u/casts/completed`
- `/u/videos`, `/u/videos/clips`, `/u/videos/live`, `/u/studio`, `/u/studio/upload`, `/u/studio/videos/$id`, `/u/studio/videos/$id/clips`
- `/u/history`, `/u/history/videos`, `/u/history/profiles`, `/u/history/events`
- `/u/organizer`, `/u/organizer/events`, `/u/organizer/organizations`

## Intentional Redirects

- `/organizers` -> `/events/organizers`
- `/organizers/$slug` -> `/events/organizers/$slug`
- `/organizers/new` -> `/events/organizers/new`
- `/organizers/$slug/manage` -> `/events/organizers/$slug/manage`
- `/u` -> `/u/me`
- `/u/casts` -> `/u/casts/all`
- `/u/profile/me` -> `/u/profile`
- `/u/videos/me` -> `/u/videos`

## Removed Routes

- `/u/recording-requests/*` was removed. Casting requests now live only under `/u/casts/*`.

## Follow-Up Candidates

- `/u/profile/analytics`, `/u/profile/earn`, and `/u/profile/my-rallycasts` have pages, but still need production data depth.
- `/u/videos/live` has an empty-state route; live creation belongs in Studio once live streaming is ready.
- `/u/studio` has disabled live/analytics actions, so those controls need real workflows before launch.
- `/u/settings` includes a security card with a disabled "Coming soon" action.
- `/shop` is navigable but mostly storefront shell content.
