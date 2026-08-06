# Deployment — Ubuntu VPS (IONOS)

Once Was Yours ships first to **`oncewasyours.gestionatech.de`** on the shared
IONOS VPS **`217.154.166.155`**, living under `~/apps/` alongside the existing
Django apps (`frisivo` / `gestiona` in `~/apps/gtech`). It runs as a **Next.js
standalone** Node server behind **nginx** (not Vercel).

- App directory: `~/apps/oncewasyours`
- Monorepo standalone entry: `apps/web/.next/standalone/apps/web/server.js`
- Node app port: **3000** (loopback only; change if another app already uses it)

## 0. DNS (GoDaddy)

`gestionatech.de` DNS is managed at GoDaddy. Add an **A record**:

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| A | `oncewasyours` | `217.154.166.155` | 600 |

→ resolves `oncewasyours.gestionatech.de`.

## 1. Prerequisites (once per server)

Node 22 + pnpm (corepack) + nginx + git. If the Django stack already installed
nginx/git you only need Node + pnpm:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx git
sudo corepack enable && corepack prepare pnpm@11.20.0 --activate
node -v && pnpm -v
```

## 2. Get the code

```bash
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/mignoncharly/formerly_yours.git oncewasyours
cd oncewasyours
pnpm install --frozen-lockfile
```

> The GitHub repo is still named `formerly_yours`; we clone it into a directory
> named `oncewasyours`. (Rename the repo later with `gh repo rename once_was_yours`
> if desired — then update the remote.)

## 3. Environment

```bash
cp apps/web/.env.example apps/web/.env.local
# edit apps/web/.env.local:
#   NEXT_PUBLIC_APP_URL=https://oncewasyours.gestionatech.de
#   OWY_DATA_DIR=/home/mignon/apps/oncewasyours/data   (persists across deploys)
#   OWY_ADMIN_KEY=<long random string>
#   NEXT_PUBLIC_SUPABASE_URL / *_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY (Phase 2+)
mkdir -p ~/apps/oncewasyours/data
```

## 4. Build + stage the standalone bundle

```bash
export NEXT_PUBLIC_APP_URL=https://oncewasyours.gestionatech.de
pnpm build
# standalone needs static + public copied next to the server entry:
cp -r apps/web/.next/static  apps/web/.next/standalone/apps/web/.next/static
cp -r apps/web/public        apps/web/.next/standalone/apps/web/public
```

Runnable entry: `apps/web/.next/standalone/apps/web/server.js`.
(`scripts/deploy.sh` automates steps 2–4 + restart.)

## 5. systemd service

`/etc/systemd/system/oncewasyours.service`:

```ini
[Unit]
Description=Once Was Yours (web)
After=network.target

[Service]
Type=simple
User=mignon
WorkingDirectory=/home/mignon/apps/oncewasyours/apps/web/.next/standalone/apps/web
EnvironmentFile=/home/mignon/apps/oncewasyours/apps/web/.env.local
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
Environment=OWY_DATA_DIR=/home/mignon/apps/oncewasyours/data
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now oncewasyours
sudo systemctl status oncewasyours
```

> `OWY_DATA_DIR` lives outside `.next/`, so captured waitlist/events survive
> rebuilds. (This JSONL store is the Phase 0 fallback; Phase 2+ moves to Supabase.)

## 6. nginx (subdomain server block)

`/etc/nginx/sites-available/oncewasyours`:

```nginx
server {
  listen 80;
  server_name oncewasyours.gestionatech.de;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/oncewasyours /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 7. HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d oncewasyours.gestionatech.de
```

(Do this after the DNS A record has propagated.)

## 8. Redeploy

```bash
cd ~/apps/oncewasyours && ./scripts/deploy.sh
```

## Reading validation data on the server

```bash
curl "https://oncewasyours.gestionatech.de/api/stats?key=$OWY_ADMIN_KEY" | jq
wc -l ~/apps/oncewasyours/data/waitlist.jsonl
```
