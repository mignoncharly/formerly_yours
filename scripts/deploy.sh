#!/usr/bin/env bash
# Deploy Once Was Yours (web) on the IONOS VPS. Run from the repo root.
# See docs/deployment.md for first-time server setup.
set -euo pipefail

APP_URL="${NEXT_PUBLIC_APP_URL:-https://oncewasyours.gestionatech.de}"
SERVICE="${SERVICE:-oncewasyours}"

echo "==> Pulling latest"
git pull --ff-only

echo "==> Installing deps"
pnpm install --frozen-lockfile

echo "==> Building (NEXT_PUBLIC_APP_URL=$APP_URL)"
NEXT_PUBLIC_APP_URL="$APP_URL" pnpm build

echo "==> Staging standalone assets"
STANDALONE="apps/web/.next/standalone/apps/web"
rm -rf "$STANDALONE/.next/static" "$STANDALONE/public"
cp -r apps/web/.next/static "$STANDALONE/.next/static"
cp -r apps/web/public "$STANDALONE/public"

echo "==> Restarting service: $SERVICE"
sudo systemctl restart "$SERVICE"
sleep 1
sudo systemctl --no-pager --lines=5 status "$SERVICE" || true
echo "==> Done. https://oncewasyours.gestionatech.de"
