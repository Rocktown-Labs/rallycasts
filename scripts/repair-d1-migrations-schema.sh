#!/usr/bin/env bash
set -euo pipefail

# One-time, idempotent repair for the D1 migrations bookkeeping table.
#
# Wrangler's runner expects:
#   CREATE TABLE d1_migrations (
#     id         INTEGER PRIMARY KEY AUTOINCREMENT,
#     name       TEXT UNIQUE,
#     applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
#   )
#
# Production has a corrupted variant (id TEXT PRIMARY KEY), which makes the
# runner's housekeeping INSERT fail and roll back the entire migration batch.
# This script rebuilds the table with the expected schema, preserving the
# applied-migration names (the only column wrangler reads; applied_at gets a
# fresh timestamp).
#
# Crash safety: the old table is renamed to d1_migrations_backup and only
# dropped after the rebuilt table is verified. Every intermediate state is a
# legal starting point for another run:
#   - corrupt table, no backup  -> rename, rebuild, copy, cleanup
#   - no table, backup present  -> rebuild, copy, cleanup (interrupted repair)
#   - no table at all           -> nothing to do (wrangler creates it)
#   - table already correct     -> drop a leftover backup, nothing else
#
# If the corrupted table lost its rows entirely (a schema restore rebuilt it
# empty), the repaired table is seeded with every migration filename shipped
# in packages/db/src/migrations. The deployed apps run against the resulting
# schema, so it is the truthful bookkeeping state, and it keeps the next
# `wrangler d1 migrations apply` from re-running already-present DDL.
#
# Usage: repair-d1-migrations-schema.sh [--local] <database-name>
#   --local  operate on the local wrangler D1 store instead of --remote
#            (used for testing the script itself)

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

# When D1_DATABASE_ID is set, execute through a generated config so the
# database is addressed by its ID (what the deployed worker actually uses)
# instead of by name, which can be ambiguous after state drift.
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

DATABASE_POSITIONAL="$DATABASE_NAME"
if [ -n "${D1_DATABASE_ID:-}" ] && [ -z "${WRANGLER_CONFIG:-}" ]; then
  TEMP_CONFIG="$(mktemp --suffix=.json)"
  printf '{"d1_databases":[{"binding":"DB","database_name":"%s","database_id":"%s","migrations_dir":"%s"}]}' \
    "$DATABASE_NAME" "$D1_DATABASE_ID" "$PWD/../../packages/db/src/migrations" > "$TEMP_CONFIG"
  MODE+=("--config" "$TEMP_CONFIG")
  DATABASE_POSITIONAL="DB"
fi

# Shell-visible failures: with --json, wrangler prints API errors (an object
# like {"error": ...} or the API error body) on stdout and exits non-zero.
# Piping that into jq silently produces a confusing parse error, so check the
# exit status and output shape, and surface the raw output on failure. stderr
# is kept separate so wrangler banners never corrupt JSON parsing.
run_query() {
  local out status
  status=0
  out="$(bun x wrangler d1 execute "$DATABASE_POSITIONAL" "${MODE[@]}" --json --command "$1" \
    2>"$SCRIPT_TMP/stderr.log")" || status=$?
  if [ "$status" -ne 0 ]; then
    echo "ERROR: wrangler d1 execute failed for $DATABASE_NAME (exit $status):" >&2
    sed 's/^/  /' "$SCRIPT_TMP/stderr.log" >&2
    if [ -n "$out" ]; then
      printf '%s\n' "$out" | sed 's/^/  /' >&2
    fi
    return 1
  fi
  if [ -s "$SCRIPT_TMP/stderr.log" ]; then
    cat "$SCRIPT_TMP/stderr.log" >&2
  fi
  if printf '%s\n' "$out" | jq -e 'type == "array"' >/dev/null 2>&1; then
    printf '%s\n' "$out"
    return 0
  fi
  echo "ERROR: wrangler d1 execute returned an error for $DATABASE_NAME:" >&2
  printf '%s\n' "$out" | sed 's/^/  /' >&2
  return 1
}

# Parse helpers: never pipe run_query's stdout into jq directly, or a failure
# message would be eaten by the parser. Capture first, parse second.
table_sql() {
  local json
  json="$(run_query "SELECT sql FROM sqlite_master WHERE name = '$1';")" || return 1
  printf '%s\n' "$json" | jq -r '.[0].results[0].sql // empty'
}

query_value() { # $1 = jq filter, rest = SQL
  local filter="$1"
  shift
  local json
  json="$(run_query "$1")" || return 1
  printf '%s\n' "$json" | jq -r "$filter"
}

is_valid() {
  # Wrangler creates the table with aligned whitespace (id<TAB>INTEGER...),
  # so match word boundaries with flexible whitespace instead of an exact
  # substring. A single-space grep would reject wrangler's own DDL.
  table_sql "$1" \
    | grep -Eq 'id[[:space:]]+INTEGER[[:space:]]+PRIMARY[[:space:]]+KEY[[:space:]]+AUTOINCREMENT'
}

MAIN_SQL="$(table_sql d1_migrations)"
BACKUP_SQL="$(table_sql d1_migrations_backup)"

if [ -n "$MAIN_SQL" ] && is_valid d1_migrations; then
  if [ -n "$BACKUP_SQL" ]; then
    echo "d1_migrations is already valid; dropping leftover backup table."
    run_query "DROP TABLE d1_migrations_backup;" >/dev/null
  else
    echo "OK: $DATABASE_NAME d1_migrations schema is already valid."
  fi
  exit 0
fi

if [ -z "$MAIN_SQL" ] && [ -z "$BACKUP_SQL" ]; then
  echo "OK: $DATABASE_NAME has no d1_migrations table; wrangler creates it on first apply."
  exit 0
fi

if [ -n "$MAIN_SQL" ]; then
  if [ -n "$BACKUP_SQL" ]; then
    # A previous repair was interrupted after the backup was created: drop the
    # partially rebuilt table and continue from the backup rows.
    echo "Found both d1_migrations and d1_migrations_backup; resuming repair."
    run_query "DROP TABLE d1_migrations;" >/dev/null
  else
    echo "Renaming corrupted d1_migrations to d1_migrations_backup."
    run_query "ALTER TABLE d1_migrations RENAME TO d1_migrations_backup;" >/dev/null
  fi
fi

echo "Rebuilding d1_migrations with the schema wrangler expects."
run_query "CREATE TABLE d1_migrations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);" >/dev/null

ROW_COUNT="$(query_value '.[0].results[0].n' "SELECT COUNT(*) AS n FROM d1_migrations_backup;")"

if [ "$ROW_COUNT" != "0" ]; then
  echo "Preserving $ROW_COUNT applied-migration record(s):"
  query_value '.[0].results[].name' \
    "SELECT name FROM d1_migrations_backup ORDER BY rowid;" | sed 's/^/  /'
  run_query "INSERT INTO d1_migrations (name) SELECT name FROM d1_migrations_backup;" >/dev/null
else
  echo "Backup table is empty; seeding applied-migration names from the repo."
  for file in ../../packages/db/src/migrations/*.sql; do
    echo "  $(basename "$file")"
    run_query "INSERT INTO d1_migrations (name) VALUES ('$(basename "$file")');" >/dev/null
  done
fi

run_query "DROP TABLE d1_migrations_backup;" >/dev/null

if ! is_valid d1_migrations; then
  echo "ERROR: $DATABASE_NAME d1_migrations verification failed after repair."
  exit 1
fi

echo "OK: $DATABASE_NAME d1_migrations repaired."
