# Cron host — Raspberry Pi operations

5-minute cron pipeline on a dedicated Pi. Web stack on the droplet runs with `ENABLE_CRON=false`.

**Spec:** [`spec/server/cron.md`](../../spec/server/cron.md) · **Env:** [`swarm/env/cron.env.example`](../../swarm/env/cron.env.example)

|      |                                                 |
| ---- | ----------------------------------------------- |
| SSH  | `ssh magrelo@100.114.121.5` (Tailscale)         |
| Repo | `~/node/cut-v2`                                 |
| Env  | `server/.env` (`chmod 600`)                     |
| PM2  | `cut-cron` → `node dist/src/cron-app.js` in `server/` |

---

## Connect

```bash
ssh magrelo@100.114.121.5
```

---

## Env (`server/.env`)

Create **`swarm/env/cron.env`** locally from [`swarm/env/cron.env.example`](../../swarm/env/cron.env.example), then push it to the Pi (same idea as `web.env` / `nginx.env` on the droplet):

```bash
scp ./swarm/env/cron.env \
  magrelo@100.114.121.5:~/node/cut-v2/server/.env
ssh magrelo@100.114.121.5 "chmod 600 ~/node/cut-v2/server/.env"
```

Minimum:

- `NODE_ENV=production`, `ENABLE_CRON=true`
- `DATABASE_URL` (allowlist Pi outbound IP on DB firewall)
- `OPS_ORACLE_PK` (contest + referral oracle; address derived from the key)
- `BETTERSTACK_HEARTBEAT_URL` (recommended)

Add `PGA_API_KEY`, `DATAGOLF_API_KEY`, `SIDE_BETS_ENABLED`, RPC URLs as needed.

---

## Update

```bash
ssh magrelo@100.114.121.5
cd ~/node/cut-v2 && git fetch origin main && git merge origin/main && pnpm install && pnpm server:build && pm2 restart cut-cron
pm2 logs cut-cron --lines 30
```

If the release has DB migrations, run **before** `pm2 restart`:

```bash
cd ~/node/cut-v2/server && set -a && source .env && set +a && pnpm exec prisma migrate deploy
```

---

## PM2

Start **Node on the built file** (do not `pm2 start pnpm` — PM2 treats the pnpm shim as JS and crashes).

**First start / recreate after env or entrypoint changes:**

```bash
cd ~/node/cut-v2/server
pm2 delete cut-cron 2>/dev/null || true
NODE_ENV=production pm2 start dist/src/cron-app.js --name cut-cron
pm2 save && pm2 startup   # run the sudo command it prints once
```

|         |                        |
| ------- | ---------------------- |
| Logs    | `pm2 logs cut-cron`    |
| Restart | `pm2 restart cut-cron` |
| Status  | `pm2 list`             |

Expect `CRON-ONLY APPLICATION`, `Cron Enabled: true`, and `[CRON]` lines every ~5 min.

---

## One-off CLI

```bash
cd ~/node/cut-v2 && set -a && source server/.env && set +a
pnpm run service:init-event pga-golf R2026033
```

No `--` after `pnpm run`. Full list: [`spec/server/cron.md`](../../spec/server/cron.md).

---

## Related

- [`swarm/README.md`](../../swarm/README.md) — droplet web stack
- [`docs/sports/golf/event-activation-runbook.md`](../sports/golf/event-activation-runbook.md)
- [`docs/sports/f1/event-activation-runbook.md`](../sports/f1/event-activation-runbook.md)
