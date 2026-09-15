# Alchemy state and v2 migration

## Decision for the launch branch

RallyCasts remains on the pinned Alchemy v1 runtime for this launch change. The
current production and preview resources are managed by the v1 state store, and
this branch must not create a second copy of those resources while auth and email
changes are being validated.

The Alchemy v2 migration guide confirms that v1 state is not compatible with v2.
A safe migration requires all of the following:

- Pin every physical resource name to the name already used by v1.
- Deploy once with `--adopt` so the new state store takes ownership of existing
  resources rather than creating replacements.
- Verify D1, R2, Vectorize, Queues, Durable Objects, Workers, routes, and custom
  domains in an isolated staging stage before production.
- Keep the migration separate from the launch branch so a failed adoption cannot
  affect authentication, payments, media, or email rollout.

The published v2 line is also an Effect 4 migration. This repository currently
uses the Alchemy v1 API and does not pin the v2/Effect 4 dependency set. A v2
conversion therefore remains a separate migration, not a dependency-only
upgrade.

## State-store recovery rule

`CloudflareStateStore` is shared by the deployment stages and authenticates with
one repository-managed token. Normal CI deployments must not force-redeploy the
state-service Worker. The deploy workflow updates the existing `STATE_TOKEN`
secret through Wrangler, then lets Alchemy reconcile the application resources.
Forcing the state-service upload can race that secret deployment and cause the
state store to reject the token used by the same job.

`ALCHEMY_STATE_FORCE_UPDATE=true` is reserved for an explicitly approved
state-service recovery, followed by a state-store health check. It is not set by
normal preview, staging, production, or cleanup workflows.

## References

- [Alchemy v2 migration guide](https://alchemy.run/migrating-from-v1)
- [Alchemy resource adoption](https://alchemy.run/cli/adopting-resources)
- [Alchemy Cloudflare provider commands](https://alchemy.run/cli/cloudflare)
