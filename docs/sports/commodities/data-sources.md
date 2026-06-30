# Commodities data sources

**Status:** Price API not selected. Development and dry-runs use deterministic fixture data.

**Related:** [competition-brief.md](competition-brief.md) · [event-activation-runbook.md](event-activation-runbook.md)

---

## Decision

| Role | Source |
|------|--------|
| **Development (current)** | Deterministic fixture OHLC/quotes in `server/src/sports/commodities/fixtureMarketData.ts` |
| **Production (TBD)** | Licensed futures market data API — vendor selection in progress |

Fixture data is seeded on event init and field sync (`syncQuotes`, `syncPriceHistory`, `syncLiveScores`). No external HTTP calls.

---

## Fixture → platform mapping

| Fixture field | Platform field |
|---------------|----------------|
| `FixtureDailyBar.open` / `close` | `scoreData.openPrice`, `currentPrice`, `closePrice` |
| `FixtureQuote` snapshot | `Participant.metadata.quote` |
| `fixturePriceHistory()` closes | `Participant.metadata.priceHistory` |
| Computed % return | `scoreData.pctReturn`, `EventParticipant.total` (fixed-point ×10) |

---

## Catalog symbols

24 CME-style futures tickers (e.g. `CL=F`, `GC=F`) in `commodityCatalog.ts`. `Participant.externalId` is the ticker without the `=F` suffix (e.g. `CL`).

When a vendor API is integrated, add a client module that maps catalog `symbol` values to the vendor's symbology and replace calls in `syncQuotes.ts`, `syncPriceHistory.ts`, and `syncLiveScores.ts`.

---

## externalId resolution

**Pattern:** ISO calendar date `YYYY-MM-DD` — e.g. `2026-06-29` (anchor date).

Session open/close are set at init (explicit `--open`/`--close` or env defaults) and stored in `metadata.commodities`. Cron metadata sync preserves stored bounds and only fills defaults when missing.

**Phase A scoring:** Fixture (and future vendor daily) OHLC uses the anchor date, not the custom window timestamps. Intraday scoring at `sessionOpen`/`sessionClose` requires API Ninjas integration — see [COMMODITIES_APININJA_PLAN.md](../../../COMMODITIES_APININJA_PLAN.md).

---

## Env vars

| Variable | Default | Notes |
|----------|---------|-------|
| `COMMODITIES_SESSION_TZ` | `America/New_York` | Default timezone when init omits session flags |
| `COMMODITIES_SESSION_OPEN` | `09:30` | Default open time (overridable per event at init) |
| `COMMODITIES_SESSION_CLOSE` | `16:00` | Default close time (overridable per event at init) |

---

## Validation scripts

| Script | Purpose |
|--------|---------|
| `script:commodities-data-spike` | Print fixture returns for all 24 symbols on a session date |
| `script:commodities-dry-run` | End-to-end contest ranking on fixture prices |
| `script:commodities-local-eval` | Enable sport, init event, refresh fixture data, open eval contest |
| `script:commodities-cleanup-local` | Remove all commodities events/contests from local DB (keeps catalog) |
