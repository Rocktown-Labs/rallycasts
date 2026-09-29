#!/usr/bin/env bash
# Local end-to-end exercise of repair-d1-migrations-schema.sh and
# validate-d1-migrations-schema.sh against a local wrangler D1.
# Not a CI test: run manually from the repo root with
#   bash scripts/test-d1-repair-local.sh
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEST_DIR="/tmp/opencode/d1-repair-test"
PERSIST_DIR="$REPO_ROOT/apps/server/.wrangler"
DB="repair-test-db"

PASS=0
FAIL=0

CONFIG="$TEST_DIR/wrangler-test.jsonc"
MIGRATION_COUNT="$(ls "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/packages/db/src/migrations/"*.sql | wc -l | tr -d ' ')"

mkdir -p "$TEST_DIR"
cat > "$CONFIG" <<EOF
{
  "name": "repair-test",
  "compatibility_date": "2026-06-16",
  "d1_databases": [
    { "binding": "DB", "database_name": "$DB", "database_id": "local-test" }
  ]
}
EOF

sq() {
  cd "$REPO_ROOT/apps/server"
  bun x wrangler d1 execute "$DB" --local --config "$CONFIG" --command "$1" --json 2>/dev/null
}

reset_db() {
  # wrangler --local persists state next to the --config file, so that is
  # the directory that actually needs clearing between scenarios.
  rm -rf "$TEST_DIR/.wrangler" "$PERSIST_DIR"
}

expect_exit() { # $1 expected, $2 label, rest = command
  local expected="$1"; local label="$2"; shift 2
  "$@" >/dev/null 2>&1
  local actual="$?"
  if [ "$actual" = "$expected" ]; then
    PASS=$((PASS + 1)); echo "PASS: $label"
  else
    FAIL=$((FAIL + 1)); echo "FAIL: $label (expected exit $expected, got $actual)"
  fi
}

check() { # $1 label, rest = jq expression over single-value query output
  local label="$1"; shift
  local out
  out="$@"
  if [ "$out" = "1" ]; then
    PASS=$((PASS + 1)); echo "PASS: $label"
  else
    FAIL=$((FAIL + 1)); echo "FAIL: $label (got '$out')"
  fi
}

validator() {
  cd "$REPO_ROOT" && WRANGLER_CONFIG="$CONFIG" bash scripts/validate-d1-migrations-schema.sh --local "$DB"
}

repair() {
  cd "$REPO_ROOT" && WRANGLER_CONFIG="$CONFIG" bash scripts/repair-d1-migrations-schema.sh --local "$DB"
}

echo "== Scenario 1: fresh database, no table (preview DBs) =="
reset_db
expect_exit 0 "repair: nothing to do" repair
expect_exit 0 "validator: missing table is OK" validator

echo "== Scenario 2: corrupted table with rows (prod) =="
reset_db
sq "CREATE TABLE d1_migrations (id TEXT PRIMARY KEY, name TEXT, applied_at TIMESTAMP);" >/dev/null
sq "INSERT INTO d1_migrations (id, name) VALUES ('a', '0001_first.sql'), ('b', '0002_second.sql');" >/dev/null
expect_exit 1 "validator: corrupted table fails" validator
expect_exit 0 "repair: rebuilds corrupted table" repair
check "repair preserved both rows" "$(sq "SELECT COUNT(*) = 2 AS ok FROM d1_migrations;" | jq '.[0].results[0].ok')"
check "repair dropped the backup" "$(sq "SELECT COUNT(*) = 0 AS ok FROM sqlite_master WHERE name = 'd1_migrations_backup';" | jq '.[0].results[0].ok')"
expect_exit 0 "validator: passes after repair" validator

echo "== Scenario 3: repair is idempotent =="
expect_exit 0 "repair: second run is a no-op" repair
check "rows still intact" "$(sq "SELECT COUNT(*) = 2 AS ok FROM d1_migrations;" | jq '.[0].results[0].ok')"

echo "== Scenario 4: interrupted repair (backup present, main missing) =="
reset_db
sq "CREATE TABLE d1_migrations_backup (id TEXT PRIMARY KEY, name TEXT, applied_at TIMESTAMP);" >/dev/null
sq "INSERT INTO d1_migrations_backup (id, name) VALUES ('a', '0001_first.sql');" >/dev/null
expect_exit 0 "repair: resumes from backup" repair
check "resumed row preserved" "$(sq "SELECT COUNT(*) = 1 AS ok FROM d1_migrations;" | jq '.[0].results[0].ok')"
expect_exit 0 "validator passes" validator

echo "== Scenario 5: corrupted and empty (lost rows) =="
reset_db
sq "CREATE TABLE d1_migrations (id TEXT PRIMARY KEY, name TEXT, applied_at TIMESTAMP);" >/dev/null
expect_exit 0 "repair: seeds from repo migrations" repair
check "seeded every migration ($MIGRATION_COUNT)" "$(sq "SELECT COUNT(*) = $MIGRATION_COUNT AS ok FROM d1_migrations;" | jq '.[0].results[0].ok')"
expect_exit 0 "validator passes" validator

echo "== Scenario 6: leftover cleanup when table is valid =="
reset_db
sq "CREATE TABLE d1_migrations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);" >/dev/null
sq "CREATE TABLE d1_migrations_backup (id TEXT PRIMARY KEY, name TEXT);" >/dev/null
expect_exit 0 "repair: drops leftover backup" repair
check "backup cleaned up" "$(sq "SELECT COUNT(*) = 0 AS ok FROM sqlite_master WHERE name = 'd1_migrations_backup';" | jq '.[0].results[0].ok')"
expect_exit 0 "validator passes" validator

echo "== Scenario 7: wrangler-created table passes the guard =="
reset_db
# Apply the real migrations with wrangler itself, exactly like the deploy
# workflow does. Wrangler creates d1_migrations with aligned-whitespace DDL,
# which a single-space check would wrongly reject. The config must live in
# TEST_DIR: wrangler persists local D1 state next to the config file.
APPLY_CONFIG="$TEST_DIR/wrangler-apply.json"
printf '{"d1_databases":[{"binding":"DB","database_name":"%s","database_id":"local-test","migrations_dir":"%s"}]}' \
  "$DB" "$REPO_ROOT/packages/db/src/migrations" > "$APPLY_CONFIG"
(cd "$REPO_ROOT/apps/server" && bun x wrangler d1 migrations apply DB --local --config "$APPLY_CONFIG" >/dev/null 2>&1)
check "wrangler created the bookkeeping table" "$(sq "SELECT COUNT(*) > 0 AS ok FROM sqlite_master WHERE name = 'd1_migrations';" | jq '.[0].results[0].ok')"
check "wrangler recorded every migration" "$(sq "SELECT COUNT(*) = $MIGRATION_COUNT AS ok FROM d1_migrations;" | jq '.[0].results[0].ok')"
expect_exit 0 "validator accepts wrangler's own table" validator
expect_exit 0 "repair leaves wrangler's table alone" repair
check "bookkeeping rows untouched" "$(sq "SELECT COUNT(*) = $MIGRATION_COUNT AS ok FROM d1_migrations;" | jq '.[0].results[0].ok')"

echo
echo "Passed: $PASS, Failed: $FAIL"
rm -rf "$PERSIST_DIR" "$TEST_DIR"
[ "$FAIL" = "0" ]
