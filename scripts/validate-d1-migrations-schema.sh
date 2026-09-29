#!/usr/bin/env bash
set -euo pipefail

# Validate that the D1 migrations bookkeeping table has the schema Wrangler's
# migration runner expects. A corrupted schema (e.g. `id TEXT PRIMARY KEY`)
# causes the housekeeping INSERT to fail and rolls back the entire migration
# batch, even though the schema changes succeeded.
#
# A missing table is a valid pre-apply state: `wrangler d1 migrations apply`
# creates it with the correct schema itself. Only a table that exists with
# the wrong schema is corruption. Repairs go through
# scripts/repair-d1-migrations-schema.sh.

MODE=("--remote")
if [ "${1:-}" = "--local" ]; then
  MODE=("--local")
  shift
fi

DATABASE_NAME="${1:-}"

if [ -z "$DATABASE_NAME" ]; then
  echo "Usage: $0 [--local] <database-name>"
  exit 1
fi

if [ "${MODE[0]}" = "--remote" ]; then
  if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] || [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
    echo "ERROR: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set."
    exit 1
  fi
fi

# Optional explicit config for exercising this script against a local D1
# (test-only; CI and production never set it).
if [ -n "${WRANGLER_CONFIG:-}" ]; then
  MODE+=("--config" "$WRANGLER_CONFIG")
fi

TEMP_CONFIG=""
SCRIPT_TMP="$(mktemp -d)"
cleanup_temp() {
  if [ -n "$TEMP_CONFIG" ]; then
    rm -f "$TEMP_CONFIG"
  fi
  rm -rf "$SCRIPT_TMP"
}
trap cleanup_temp EXIT

cd apps/server

# When D1_DATABASE_ID is set, execute through a generated config so the
# database is addressed by its ID (what the deployed worker actually uses)
# instead of by name, which can be ambiguous after state drift.
DATABASE_POSITIONAL="$DATABASE_NAME"
if [ -n "${D1_DATABASE_ID:-}" ] && [ -z "${WRANGLER_CONFIG:-}" ]; then
  TEMP_CONFIG="$(mktemp --suffix=.json)"
  printf '{"d1_databases":[{"binding":"DB","database_name":"%s","database_id":"%s","migrations_dir":"%s"}]}' \
    "$DATABASE_NAME" "$D1_DATABASE_ID" "$PWD/../../packages/db/src/migrations" > "$TEMP_CONFIG"
  MODE+=("--config" "$TEMP_CONFIG")
  DATABASE_POSITIONAL="DB"
fi

SCHEMA_JSON=""
status=0
SCHEMA_JSON="$(
  bun x wrangler d1 execute "$DATABASE_POSITIONAL" "${MODE[@]}" --json \
    --command "SELECT sql FROM sqlite_master WHERE name = 'd1_migrations';" \
    2>"$SCRIPT_TMP/stderr.log"
)" || status=$?
if [ "$status" -ne 0 ]; then
  echo "ERROR: wrangler d1 execute failed for $DATABASE_NAME (exit $status):"
  sed 's/^/  /' "$SCRIPT_TMP/stderr.log"
  if [ -n "$SCHEMA_JSON" ]; then
    printf '%s\n' "$SCHEMA_JSON" | sed 's/^/  /'
  fi
  exit 1
fi
if [ -s "$SCRIPT_TMP/stderr.log" ]; then
  cat "$SCRIPT_TMP/stderr.log" >&2
fi
if ! printf '%s\n' "$SCHEMA_JSON" | jq -e 'type == "array"' >/dev/null 2>&1; then
  echo "ERROR: wrangler d1 execute returned an error for $DATABASE_NAME:"
  printf '%s\n' "$SCHEMA_JSON" | sed 's/^/  /'
  exit 1
fi

ROW_COUNT="$(printf '%s\n' "$SCHEMA_JSON" | jq '.[0].results | length')"

if [ "$ROW_COUNT" = "0" ]; then
  echo "OK: $DATABASE_NAME has no d1_migrations table yet; wrangler creates it on first apply."
  exit 0
fi

SQL_TEXT="$(printf '%s\n' "$SCHEMA_JSON" | jq -r '.[0].results[0].sql // ""')"

# Wrangler creates the table with aligned whitespace (id<TAB>INTEGER...),
# so match word boundaries with flexible whitespace instead of an exact
# substring. A single-space grep would reject wrangler's own DDL.
if printf '%s\n' "$SQL_TEXT" | grep -Eq 'id[[:space:]]+INTEGER[[:space:]]+PRIMARY[[:space:]]+KEY[[:space:]]+AUTOINCREMENT'; then
  echo "OK: $DATABASE_NAME d1_migrations schema is valid."
  exit 0
fi

echo "ERROR: $DATABASE_NAME d1_migrations table does not have the expected schema."
echo "The migrations bookkeeping table is corrupted (e.g. id TEXT PRIMARY KEY)."
echo "Run scripts/repair-d1-migrations-schema.sh \"$DATABASE_NAME\" to rebuild it."
printf '%s\n' "$SCHEMA_JSON"
exit 1
