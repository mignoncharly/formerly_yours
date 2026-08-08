#!/usr/bin/env bash
# Cron wrapper for the daily Stripe reconciliation (scripts/stripe-reconcile.mjs).
# Sets up nvm Node 22, logs, and raises a Sentry alert on a mismatch (exit 2) or
# a run failure (exit 1). Invoked from the user crontab under flock — see
# docs/monitoring.md.
set -uo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"; mkdir -p logs

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 22 >/dev/null 2>&1 || true

OUT="$(mktemp)"; trap 'rm -f "$OUT"' EXIT
node scripts/stripe-reconcile.mjs >"$OUT" 2>&1
CODE=$?
cat "$OUT"

if [ "$CODE" -ne 0 ]; then
  LEVEL="error"; [ "$CODE" -eq 2 ] && MSG="Stripe reconciliation found MISMATCHES" || MSG="Stripe reconciliation run failed"
  tail -n 30 "$OUT" | node scripts/sentry-notify.mjs "$MSG (exit $CODE)" "$LEVEL" || true
fi
exit "$CODE"
