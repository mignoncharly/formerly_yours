# Monitoring & scheduled jobs

Production monitoring and recurring work run on the **server** via the user
crontab (`crontab -e`), each wrapped in `flock` so runs never overlap. GitHub
Actions has been **removed** — the server is the single source of scheduled work.

> Why cron and not a systemd timer? This is a shared box: `mignon` has no
> passwordless sudo to install system units, and user-linger is off (so
> `systemctl --user` timers wouldn't survive logout). Cron + `flock` is the
> established pattern here (see the AirProche jobs). Equivalent **systemd unit
> files ship in `deploy/oncewasyours-smoke.{service,timer}`** for a future
> root-enabled install.

## Jobs

| Job              | Schedule        | Command (via `flock`)                        | Log                       |
| ---------------- | --------------- | -------------------------------------------- | ------------------------- |
| Smoke monitor    | every 15 min    | `scripts/smoke-monitor.sh`                   | `logs/smoke-monitor.log`  |
| Retention cleanup| daily 03:40 UTC | `scripts/cleanup-cron.sh`                    | `logs/cleanup.log`        |

Cron lines (already installed):

```cron
*/15 * * * * /usr/bin/flock -n /tmp/owy-smoke-monitor.lock /home/mignon/apps/oncewasyours/scripts/smoke-monitor.sh >> /home/mignon/apps/oncewasyours/logs/cron.log 2>&1
40 3 * * *   /usr/bin/flock -n /tmp/owy-cleanup.lock       /home/mignon/apps/oncewasyours/scripts/cleanup-cron.sh   >> /home/mignon/apps/oncewasyours/logs/cleanup.log 2>&1
```

## Smoke monitor (synthetic uptime)

Runs the Playwright smoke suite (`tests/e2e/smoke.spec.ts`, 6 public happy-path
checks) against production with 2 retries. Replaces the old `e2e.yml` schedule.

- **Logs:** one line per run to `logs/smoke-monitor.log` (`OK`/`FAIL`), plus the
  failing output appended on failure.
- **Alerts:** on failure it POSTs a Sentry event via `scripts/sentry-notify.mjs`
  (best-effort; no-op if no DSN). No secrets live in the script — the DSN is read
  from `apps/web/.env.local`.
- **Exit code:** mirrors Playwright (non-zero on failure).

```bash
# Run manually:
./scripts/smoke-monitor.sh
# Point at a preview:
PLAYWRIGHT_BASE_URL=https://staging.example ./scripts/smoke-monitor.sh
# Disable: comment the crontab line (crontab -e).
```

## Retention cleanup (data minimisation)

Conservative and **idempotent** — only prunes transient/derived rows, never
commerce data (listings, stories, orders, payments, offers, messages, profiles):

- read `notifications` older than `OWY_NOTIF_RETENTION_DAYS` (default **90**);
- `email_deliveries` audit rows older than `OWY_EMAIL_LEDGER_RETENTION_DAYS`
  (default **180**).

Runs in a single transaction; logs the deleted counts; alerts Sentry on failure.

```bash
# Run manually:
./scripts/cleanup-cron.sh
# Tune retention (env):
OWY_NOTIF_RETENTION_DAYS=120 ./scripts/cleanup-cron.sh
# Disable: comment the crontab line.
```

## Health checks

- Service: `systemctl status oncewasyours` · logs `journalctl -u oncewasyours -f`.
- Manual liveness: `curl -sI https://oncewasyours.com | head -1`.
- Errors: Sentry (org `gestiona-tech`, project `oncewasyours`) — captures app
  runtime errors plus cron-job failures raised by `sentry-notify.mjs`.

## Backups & recovery

The database is managed **Supabase Postgres** — daily automated backups + PITR
are handled by Supabase (dashboard → Database → Backups). Application state is
100% in Postgres and Supabase Storage; the server holds no unique data (it builds
from `main` and reads `.env.local`). Recovery = restore the Supabase backup and
redeploy from `main`.
