#!/usr/bin/env bash
# Synthetic production uptime monitor. Runs the Playwright smoke suite against
# the live site, logs the result, and on failure raises a Sentry event. Replaces
# the old GitHub Actions `e2e.yml` schedule (which is removed). Designed for cron
# with flock so runs never overlap — see docs/monitoring.md.
#
#   Manual run:   ./scripts/smoke-monitor.sh
#   Disable:      comment out the crontab line (crontab -e)
#
# Exit code mirrors Playwright: 0 = all smoke tests passed, non-zero = failure.
set -uo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

LOG_DIR="$REPO/logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/smoke-monitor.log"
RUN_LOG="$(mktemp)"
trap 'rm -f "$RUN_LOG"' EXIT

BASE_URL="${PLAYWRIGHT_BASE_URL:-https://oncewasyours.gestionatech.de}"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Isolated nvm Node 22 (system Node is 18 on this shared box — do not use it).
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 22 >/dev/null 2>&1 || true

# Two retries to ride out transient network blips (matches the old CI behaviour)
# without alerting on a single flaky request.
PLAYWRIGHT_BASE_URL="$BASE_URL" \
  ./node_modules/.bin/playwright test --retries=2 --reporter=list \
  >"$RUN_LOG" 2>&1
CODE=$?

if [ "$CODE" -eq 0 ]; then
  echo "$TS OK   base=$BASE_URL smoke passed" >>"$LOG"
else
  echo "$TS FAIL base=$BASE_URL exit=$CODE" >>"$LOG"
  # Append the failing output to the persistent log for later inspection…
  tail -n 40 "$RUN_LOG" >>"$LOG"
  # …and raise a Sentry alert (best-effort; no-op if no DSN configured).
  tail -n 30 "$RUN_LOG" | node scripts/sentry-notify.mjs \
    "Production smoke tests FAILED (exit $CODE) against $BASE_URL" error || true
fi

exit "$CODE"
