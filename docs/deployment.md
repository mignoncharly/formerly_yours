# Deployment — Ubuntu VPS (IONOS)

Once Was Yours ships first to **`oncewasyours.gestionatech.de`** on the shared
IONOS VPS **`217.154.166.155`**, under `~/apps/oncewasyours`, alongside the other
apps (Django `frisivo`/`gtech`, Node `opendatajobradar`, …). It runs as a
**Next.js standalone** Node server behind the box's existing **nginx**.

- App directory: `~/apps/oncewasyours`
- Standalone entry: `apps/web/.next/standalone/apps/web/server.js`
- Port: **3000** (loopback; 3001/3002/8000 are already taken by other apps)
- Node: an **isolated nvm Node 22** for this app only — the system Node stays 18
  so the other Node apps are untouched.

## Current status

The build + run pipeline is **already set up on the server** (isolated Node 22 +
pnpm, repo cloned, `apps/web/.env.local` populated with the prod Supabase +
Sentry values, built, standalone staged, boot-tested on `:3000` → `/` and
`/feed` return 200). The generated `sudo`-install files are at
`~/apps/oncewasyours/deploy/`. What remains is the DNS record + the `sudo`
steps below (no passwordless sudo on this box).

## 0. DNS (GoDaddy)  ← you

`gestionatech.de` DNS is at GoDaddy. Add an **A record**:

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| A | `oncewasyours` | `217.154.166.155` | 600 |

## 1. Install the systemd service  ← sudo

```bash
sudo cp ~/apps/oncewasyours/deploy/oncewasyours.service /etc/systemd/system/oncewasyours.service
sudo systemctl daemon-reload
sudo systemctl enable --now oncewasyours
systemctl --no-pager status oncewasyours
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/   # expect 200
```

## 2. nginx server block  ← sudo

```bash
sudo cp ~/apps/oncewasyours/deploy/nginx-oncewasyours.conf /etc/nginx/sites-available/oncewasyours
sudo ln -s /etc/nginx/sites-available/oncewasyours /etc/nginx/sites-enabled/oncewasyours
sudo nginx -t && sudo systemctl reload nginx
```

## 3. HTTPS (after DNS propagates)  ← sudo

```bash
sudo certbot --nginx -d oncewasyours.gestionatech.de
```

Then visit **https://oncewasyours.gestionatech.de**.

## First-time server bootstrap (already done — for reference)

```bash
# isolated Node 22 (does NOT touch system Node 18)
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
nvm install 22 && nvm alias default 22
corepack enable && corepack prepare pnpm@11.20.0 --activate

# code + env + build
git clone https://github.com/mignoncharly/formerly_yours.git ~/apps/oncewasyours
cd ~/apps/oncewasyours
cp apps/web/.env.example apps/web/.env.local   # fill Supabase + Sentry + OWY_* values
mkdir -p data
pnpm install --frozen-lockfile
NEXT_PUBLIC_APP_URL=https://oncewasyours.gestionatech.de pnpm build
# stage standalone assets:
S=apps/web/.next/standalone/apps/web
cp -r apps/web/.next/static "$S/.next/static"
cp -r apps/web/public "$S/public"
```

## Redeploy (after the service exists)

```bash
cd ~/apps/oncewasyours && ./scripts/deploy.sh
```

`deploy.sh` pulls, installs, builds, stages assets, regenerates the systemd unit
with the current Node path, and `sudo systemctl restart oncewasyours`.

## Reading validation data on the server

```bash
# OWY_ADMIN_KEY is in apps/web/.env.local (never printed):
KEY=$(grep '^OWY_ADMIN_KEY=' ~/apps/oncewasyours/apps/web/.env.local | cut -d= -f2)
curl "https://oncewasyours.gestionatech.de/api/stats?key=$KEY" | jq
wc -l ~/apps/oncewasyours/data/waitlist.jsonl
```

> The JSONL store is the Phase 0 fallback; waitlist/analytics move to Supabase in
> later phases. `OWY_DATA_DIR` points outside `.next/`, so data survives rebuilds.
