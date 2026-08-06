# Deployment — Ubuntu VPS (IONOS)

Phase 0 runs as a single **Next.js standalone** Node server behind **nginx**.
`next.config.mjs` sets `output: "standalone"`, so the build produces a
self-contained server under `.next/standalone`.

> This replaces the Vercel hosting mentioned in the planning docs — we host the
> web app on the IONOS Ubuntu VPS instead.

## 1. Server prerequisites (once)

```bash
sudo apt update && sudo apt upgrade -y
# Node 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx git
node -v   # v22.x
```

## 2. Get the code

```bash
sudo mkdir -p /var/www && sudo chown "$USER" /var/www
cd /var/www
git clone https://github.com/mignoncharly/formerly_yours.git
cd formerly_yours
npm ci
```

## 3. Environment

```bash
cp .env.example .env.local
# edit:
#   NEXT_PUBLIC_APP_URL=https://your-domain
#   FY_DATA_DIR=/var/www/formerly_yours/data   (persistent; survives deploys)
#   FY_ADMIN_KEY=<long random string>
```

## 4. Build + prepare the standalone bundle

```bash
npm run build
# standalone needs static assets + public copied next to server.js:
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

The runnable server is then `.next/standalone/server.js`.

## 5. systemd service

`/etc/systemd/system/formerly-yours.service`:

```ini
[Unit]
Description=Formerly Yours (Phase 0)
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/formerly_yours/.next/standalone
# Load NEXT_PUBLIC_APP_URL, FY_DATA_DIR, FY_ADMIN_KEY from here:
EnvironmentFile=/var/www/formerly_yours/.env.local
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
Environment=FY_DATA_DIR=/var/www/formerly_yours/data
ExecStart=/usr/bin/node server.js
Restart=always
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo mkdir -p /var/www/formerly_yours/data
sudo chown -R www-data:www-data /var/www/formerly_yours/data
sudo systemctl daemon-reload
sudo systemctl enable --now formerly-yours
sudo systemctl status formerly-yours
```

> Because `FY_DATA_DIR` lives outside `.next/`, the captured waitlist/events
> survive rebuilds and redeploys.

## 6. nginx reverse proxy

`/etc/nginx/sites-available/formerly-yours`:

```nginx
server {
  listen 80;
  server_name your-domain www.your-domain;

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
sudo ln -s /etc/nginx/sites-available/formerly-yours /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 7. HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain -d www.your-domain
```

Point the IONOS DNS A record for the domain at the VPS IP first.

## 8. Redeploy

```bash
cd /var/www/formerly_yours
git pull
npm ci
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
sudo systemctl restart formerly-yours
```

> Tip: put steps 4 + 8 in a `scripts/deploy.sh` once the flow settles.

## Reading validation data on the server

```bash
curl "https://your-domain/api/stats?key=$FY_ADMIN_KEY" | jq
wc -l /var/www/formerly_yours/data/waitlist.jsonl
```
