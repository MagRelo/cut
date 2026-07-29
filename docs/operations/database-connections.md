# Database connections

All environments share one DigitalOcean managed Postgres cluster. Postgres backends are processes, not lightweight handles, so the cluster's connection budget is small and fixed. Web and staging use PgBouncer; migrations and cron use direct connections.

**Env examples:** [`server/.env.example`](../../server/.env.example) · [`swarm/env/web.env.example`](../../swarm/env/web.env.example) · [`swarm/env/cron.env.example`](../../swarm/env/cron.env.example)

## Connection budget

DigitalOcean allocates **25 backend connections per 1 GiB of cluster RAM**, minus **3 reserved for maintenance**. That ceiling covers the entire cluster — every database, every environment, every pool. Separate database names (`v4`, `playthecut_staging`) do **not** get separate budgets.

The current cluster is **1 GiB**: `max_connections = 25`, leaving **22 usable**. DigitalOcean's own background workers consume several more.

Prisma pools hold connections open while idle. At the default `connection_limit=5`, pointing every process at the **direct** port spends the budget from process count alone (prod replicas + staging + local + cron). Exhausting it produces:

```
FATAL: remaining connection slots are reserved for roles with the SUPERUSER attribute
```

Prisma surfaces this as `P2037`. It means the cluster-wide budget is gone, not that any single app pool is misconfigured.

## What uses which port

| Port | Path segment | Used by |
|------|--------------|---------|
| `25061` | DO **pool name** | Web and staging `DATABASE_URL` |
| `25060` | Database name | Cron, `prisma migrate deploy`, ops scripts |

One `DATABASE_URL` per process — no second env var. When you migrate, temporarily use a direct URL (or run migrate from a host whose `.env` is already direct, like the cron Pi).

PgBouncer multiplexes many client connections onto a small set of real backends. The DO **pool size** reserves that many real backends from the cluster budget; keep pool sizes plus direct consumers under ~80% of available connections.

## Pool configuration

Each DO pool binds to one database, so **staging needs its own pool**. Use **Transaction** mode. Verify the pool targets the intended database (`v4` for prod) — a wrong target still connects, then shows an empty schema.

Pooled URLs need `pgbouncer=true` so Prisma disables prepared statements (otherwise intermittent `prepared statement already exists` under concurrency):

```
DATABASE_URL=postgresql://user:pass@host:25061/pool-name?sslmode=require&pgbouncer=true
```

`.env` files are loaded by **dotenv** (Node / Prisma CLI), not by the shell. Do not `source` them in bash.

## Prisma `connection_limit`

[`server/src/lib/prisma.ts`](../../server/src/lib/prisma.ts) appends pool params to `DATABASE_URL`. Behind PgBouncer those count client→pooler connections (cheap). On direct connections they count real backends — keep them conservative.

## Cron and local

Cron stays on **direct** `25060` — long update transactions would pin pooler slots for a whole tick. See [cron-pi.md](cron-pi.md).

Local preferred order: local Postgres, or the pooler — not the shared cluster's direct port.
