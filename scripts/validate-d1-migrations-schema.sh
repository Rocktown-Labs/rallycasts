#!/usr/bin/env bash
set -euo pipefail

# Validate that the D1 migrations bookkeeping table has the schema Wrangler's
# migration runner expects. A corrupted schema (e.g. `id TEXT PRIMARY KEY`)
# causes the housekeeping INSERT to fail and rolls back the entire migration
# batch, even though the schema changes succeeded.

DATABASE_NAME="${1:-}"

if [ -z "$DATABASE_NAME" ]; then
  echo "Usage: $0 <database-name>"
  exit 1
fi

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] || [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set."
  exit 1
fi

cd apps/server

SCHEMA_JSON="$(
  bun x wrangler d1 execute "$DATABASE_NAME" --remote --json \
    --command "SELECT CASE WHEN sql LIKE '%id INTEGER PRIMARY KEY AUTOINCREMENT%' THEN 1 ELSE 0 END AS schema_ok FROM sqlite_master WHERE name = 'd1_migrations';"
)"

SCHEMA_OK="$(printf '%s\n' "$SCHEMA_JSON" | jq -r '.[0].results[0].schema_ok // 0')"

if [ "$SCHEMA_OK" != "1" ]; then
  echo "ERROR: $DATABASE_NAME d1_migrations table does not have the expected schema."
  echo "The migrations bookkeeping table is likely corrupted (e.g. id TEXT PRIMARY KEY)."
  printf '%s\n' "$SCHEMA_JSON"
  exit 1
fi

echo "OK: $DATABASE_NAME d1_migrations schema is valid."
