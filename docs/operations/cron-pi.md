# Cron host — Raspberry Pi operations

5-minute cron pipeline on a dedicated Pi. Web stack on the droplet runs with `ENABLE_CRON=false`.

**Spec:** [`spec/server/cron.md`](../../spec/server/cron.md) · **Env:** [`swarm/env/cron.env.example`](../../swarm/env/cron.env.example)

|      |                                                 |
| ---- | ----------------------------------------------- |
| SSH  | `ssh magrelo@100.114.121.5` (Tailscale)         |
| Repo | `~/cut`                                         |
| Env  | `server/.env` (`chmod 600`)                     |
| PM2  | `cut-cron` → `pnpm run start:cron` in `server/` |

---

## Connect

```bash
ssh magrelo@100.114.121.5
```

---

## Env (`server/.env`)

From [`swarm/env/cron.env.example`](../../swarm/env/cron.env.example). Minimum:

- `NODE_ENV=production`, `ENABLE_CRON=true`
- `DATABASE_URL` (allowlist Pi outbound IP on DB firewall)
- `ORACLE_ADDRESS`, `ORACLE_PRIVATE_KEY`
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
cd ~/cut/server && set -a && source .env && set +a && pnpm exec prisma migrate deploy
```

---

## PM2

**First start:**

```bash
cd ~/cut/server
NODE_ENV=production pm2 start pnpm --name cut-cron -- run start:cron
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
cd ~/cut && set -a && source server/.env && set +a
pnpm run service:init-event pga-golf R2026033
```

No `--` after `pnpm run`. Full list: [`spec/server/cron.md`](../../spec/server/cron.md).

---

## Related

- [`swarm/README.md`](../../swarm/README.md) — droplet web stack
- [`docs/sports/golf/event-activation-runbook.md`](../sports/golf/event-activation-runbook.md)
- [`docs/sports/f1/event-activation-runbook.md`](../sports/f1/event-activation-runbook.md)
