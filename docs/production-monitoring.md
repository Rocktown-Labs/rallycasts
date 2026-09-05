# Production monitoring

RallyCasts uses three monitoring layers:

1. **Cloudflare Workers Observability** is enabled by `packages/infra/alchemy.run.ts` for the API, web, and queue consumers. Invocation logs and structured `console` events are persisted; traces are sampled at 10% in production.
2. **Sentry** captures API and web exceptions. Production deploys configure the runtime DSN from `SENTRY_DSN` and upload web source maps using `SENTRY_AUTH_TOKEN`, with the commit SHA as the release. The deploy is intentionally blocked when either secret is missing.
3. **Production Monitoring** (`.github/workflows/production-monitoring.yml`) runs every 15 minutes. It checks the public API/web flows and Cloudflare Queue metrics. Any non-empty DLQ or primary-queue message older than 15 minutes fails the workflow and triggers the repository's Actions failure notifications.

## Required configuration

- Add `SENTRY_DSN` as a GitHub Actions secret for the API and web Sentry projects.
- Add `SENTRY_AUTH_TOKEN` as a GitHub Actions secret. Use a Sentry organization token scoped only to the RallyCasts project release/source-map operations.
- Ensure `CLOUDFLARE_API_TOKEN` has Queue Read access. The scheduled queue check fails closed when queue metadata cannot be read.
- Keep the existing `CLOUDFLARE_ACCOUNT_ID` secret configured.
- Configure GitHub Actions failure notifications for the production-monitoring workflow and Sentry alert rules for error rate, unhandled exceptions, and performance regressions.

## Incident response

### API or web smoke failure

1. Open the failed workflow run and identify the failing URL and response.
2. Check the affected Worker under **Workers & Pages → Observability**.
3. Check Sentry for the release matching the deployed commit SHA.
4. Roll back to the last known-good commit through the normal GitHub deployment workflow if the failure is caused by an application release.

### Queue backlog or dead-letter message

1. Check the queue's backlog, oldest-message age, and consumer retry errors in the Cloudflare Queues dashboard.
2. Inspect the corresponding structured `queue_message_failed` events in Workers Observability and the related Sentry event, if present.
3. Do not purge a DLQ before preserving the message IDs and payloads for investigation.
4. After correcting the consumer or data, replay messages through an approved, temporary consumer that validates the message schema before forwarding to the primary queue. Remove that consumer after the replay and confirm the DLQ metrics return to zero.
5. If a message cannot be safely replayed, document the message ID, reason, and compensating database action before acknowledging or purging it.

DLQ messages are retained for four days by Cloudflare. A DLQ must have an active consumer to process messages; it is not automatically replayed.

## Verification

Run the workflow manually with **Actions → Production Monitoring → Run workflow** after changing Worker configuration, queues, DNS, or Sentry settings. The deployment workflow also performs the production D1 migration check and R2 object-serving smoke test before a release is considered healthy.
