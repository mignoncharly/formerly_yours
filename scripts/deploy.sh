#!/usr/bin/env bash
# Deploy Once Was Yours (web) on the IONOS VPS. Run from the repo root on the
# server (~/apps/oncewasyours). Uses an isolated nvm Node 22 so the other apps
# on the shared box keep their system Node. See docs/deployment.md.
set -euo pipefail

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 22 >/dev/null

APP_URL="${NEXT_PUBLIC_APP_URL:-https://oncewasyours.com}"
SERVICE="${SERVICE:-oncewasyours}"
cd "$(dirname "$0")/.."

echo "==> Pulling latest"
git pull --ff-only

echo "==> Installing deps"
pnpm install --frozen-lockfile

echo "==> Building (NEXT_PUBLIC_APP_URL=$APP_URL)"
NEXT_PUBLIC_APP_URL="$APP_URL" pnpm build

echo "==> Staging standalone assets"
S=apps/web/.next/standalone/apps/web
rm -rf "$S/.next/static" "$S/public"
cp -r apps/web/.next/static "$S/.next/static"
cp -r apps/web/public "$S/public"

echo "==> Rendering systemd unit with current Node path"
NODE_BIN="$(nvm which 22)"
sed "s#__NODE_BIN__#${NODE_BIN}#g" deploy/oncewasyours.service.template > deploy/oncewasyours.service

echo "==> Restarting service (needs sudo)"
sudo systemctl restart "$SERVICE"
sleep 1
sudo systemctl --no-pager --lines=5 status "$SERVICE" || true
echo "==> Done. https://oncewasyours.com"
