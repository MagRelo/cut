# Server overview

Node.js backend (Hono + Prisma + PostgreSQL) for the v4 platform.

**Entry:** `server/src/app.ts` → mounts `apiRouter` at `/api`  
**Routes:** `server/src/routes/api.ts`  
**Schema:** `server/prisma/schema.prisma`

---

## Key directories

| Path | Purpose |
|------|---------|
| `src/routes/` | HTTP handlers |
| `src/services/` | Business logic |
| `src/sports/` | `SportModule` + `PropBetModule` registries, golf handlers |
| `src/middleware/` | Auth, admin, event editable, league membership |
| `src/cron/` | `scheduler.ts` — 5-minute pipeline |
| `src/lib/email/` | Email templates + blasts (`eventId`) |
| `packages/sport-pga-golf/` | Golf plugin (workspace package) |

---

## Related docs

- [Architecture](architecture.md)
- [API reference](api.md)
- [Data models](data-models.md)
- [Services](services.md)
- [Cron](cron.md)
- [Platform plugins](../platform/plugins.md)

---

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection |
| `ENABLE_CRON` | `true` to run scheduler in main server |
| `SIDE_BETS_ENABLED` | `true` to enable side-bet APIs + cron quote refresh |
| `DATAGOLF_API_KEY` | Side-bet quote ingest + golf field sync |
| `MAILERSEND_*` | Transactional / marketing email |
| Privy vars | Auth token verification |

Local DB: `playthecut-local` container in [docker/docker-compose.yml](../../docker/docker-compose.yml) (`playthecut` database; see `server/.env.example`).

---

## Build & scripts

```bash
pnpm run server:build
pnpm run service:init-event pga-golf R2026033   # activate golf event
```

Pass script args **without** `--` (repo convention).
