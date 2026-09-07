# Effect-TS server — future vision

**Not a spec.** Future / exploratory only. Describes a possible rewrite of the server using [Effect](https://effect.website/). Do not treat this as current architecture or an implementation plan.

As-built: [docs/platform/architecture.md](../platform/architecture.md), [spec/server](../../spec/server). Source sketch: PR [#12](https://github.com/MagRelo/cut/pull/12).

---

## Why it was interesting

The server’s real pain is in **cron + sport sync**, not Hono routing:

| Today | What Effect would buy |
|-------|------------------------|
| `try/catch` with string / `any` errors | Typed error channel on the function |
| Prisma + PGA / Hyperliquid clients passed or imported ad hoc | Layer DI — swap mocks in tests |
| Implicit failure modes on external APIs | `Effect<A, E, R>` makes PGA / network / DB failures visible |
| Ad-hoc retries | Declarative `Schedule` (exponential + bounded) |
| `Promise.all` with no backpressure | Fibers + concurrency caps |
| `console.log` in the pipeline | Spans + structured logs on each sync |

Cron is the right proving ground: self-contained, not user-facing, already the most failure-prone path.

---

## Cut-specific mapping (keep)

### Typed domain errors

A tagged error hierarchy that matches how the product actually fails:

- **NotFound** — user, event, lineup, contest, participant
- **Validation** — field + messages (lineup roster, contest settings)
- **Database** — operation + cause
- **Auth** — missing / invalid / expired / permissions
- **External** — `PgaApiError`, `RateLimitError`, `NetworkError`, commodities `MarketDataError`
- **Contest** — not editable, already locked, event mismatch, max entries, insufficient funds
- **Lineup** — invalid picks, duplicate name, event not editable, roster failed

Routes could then exhaust those tags instead of `error.name === "ValidationError"`.

### Layers instead of implicit deps

Services the pipeline already has, as replaceable layers: Prisma, config, PGA client, commodities market-data client, logger, sport registry. Tests provide mock layers; production provides live ones.

### PGA live-score sync

The current loop (leaderboard → per-player scorecards → write `EventParticipant`) is the strongest fit:

1. Skip when the event is not live (same gate as today).
2. Fetch the field, then **chunk scorecard fetches** (e.g. 15 at a time) with bounded concurrency.
3. Pure transform for round icons.
4. **Cap DB writes** (e.g. concurrency 5) and only write when the score actually changed.
5. One span: `sync-golf-live-scores` with `eventId` / updated / skipped.

### Commodities quote sync

Same idea, different failure mode — flaky market data:

1. Fetch quotes for the field snapshot.
2. Retry exponential (e.g. 2s × 3), then **fall back to cached quotes** instead of failing the whole pipeline.
3. Span: `sync-commodities-quotes`.

### Sport plugins

Keep the current plugin split (`@cut/sport-sdk` + pga / f1 / commodities). Effect would only change the **shape of the sync methods**: metadata / field / live scores return `Effect` with `SportSyncError | DatabaseError` instead of throwing. Ranking, activate/settle gates stay pure functions.

### API last

Hono handlers as Effects is optional and higher risk. Ingestion first; wrap legacy `Promise` services with `Effect.tryPromise` during any coexistence.

---

## If we ever did it

1. **Errors** — tagged types; wrap existing `try/catch` at the edges.
2. **Services** — Prisma + external API clients as layers.
3. **Ingestion** — cron pipeline + sport `sync*` functions + tracing.
4. **API** — Effect-Hono only after (3) has earned its keep.

Do not start this until there is an explicit decision to adopt Effect. Until then the server stays Promise/Hono/Prisma as documented in spec.
