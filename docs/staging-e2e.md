# Staging E2E

The `Staging E2E` workflow deploys an isolated `staging` Alchemy stage, seeds non-production fixtures, and runs Playwright against the staging Workers.

## Required GitHub environment secrets

Configure these in the `staging` environment before dispatching the workflow:

- `ALCHEMY_PASSWORD`
- `ALCHEMY_STATE_TOKEN`
- `BETTER_AUTH_SECRET` as `STAGING_BETTER_AUTH_SECRET`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `STAGING_E2E_EMAIL`
- `STAGING_E2E_PASSWORD`
- `STAGING_E2E_SEED_TOKEN`
- `STAGING_MUX_SIGNING_KEY_ID`
- `STAGING_MUX_SIGNING_KEY_SECRET`
- `STAGING_MUX_TOKEN_ID`
- `STAGING_MUX_TOKEN_SECRET`
- `STAGING_MUX_WEBHOOK_SECRET`

The Mux credentials must belong to a non-production Mux project. Configure that project’s webhook endpoint as `https://rallycasts-server-staging.rocktown-labs.workers.dev/api/v1/mux/webhook` with the matching signing secret. The seed token is only bound to non-production Workers; production deliberately ignores `E2E_SEED_TOKEN`.

## Local commands

```bash
bun run e2e:fixture
E2E_BASE_URL=... \
E2E_API_URL=... \
E2E_EMAIL=... \
E2E_PASSWORD=... \
E2E_SEED_TOKEN=... \
bun run e2e
```

The test suite covers public browser routes, authenticated event and casting pages, comments, chat messages, private signed playback, seeded clip playback, and the authenticated Mux upload draft flow. The workflow fails closed when staging credentials or fixtures are missing.
