#!/usr/bin/env bash
# Cron wrapper for the retention cleanup (scripts/cleanup.mjs). Sets up the
# isolated nvm Node 22 and the pooler connection env, logs, and raises a Sentry
# alert on failure. Invoked from the user crontab under flock — see
# docs/monitoring.md.
set -uo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"
mkdir -p logs

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 22 >/dev/null 2>&1 || true

OUT="$(mktemp)"
trap 'rm -f "$OUT"' EXIT

OWY_SECRETS_FILE="${OWY_SECRETS_FILE:-docs/supabase_sentry_keys.md}" \
SUPABASE_DB_HOST="${SUPABASE_DB_HOST:-aws-1-eu-west-1.pooler.supabase.com}" \
SUPABASE_DB_USER="${SUPABASE_DB_USER:-postgres.xcsgsbtyumkqyjznesyy}" \
SUPABASE_DB_PORT="${SUPABASE_DB_PORT:-5432}" \
  node scripts/cleanup.mjs >"$OUT" 2>&1
CODE=$?

cat "$OUT"
if [ "$CODE" -ne 0 ]; then
  tail -n 20 "$OUT" | node scripts/sentry-notify.mjs "Retention cleanup FAILED (exit $CODE)" error || true
fi
exit "$CODE"
