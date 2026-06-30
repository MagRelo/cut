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

**Pattern:** ISO calendar date `YYYY-MM-DD` — e.g. `2026-06-29`.

Session open/close are derived from env (default 9:30–16:00 America/New_York) and stored in `metadata.commodities`.

---

## Env vars

| Variable | Default |
|----------|---------|
| `COMMODITIES_SESSION_TZ` | `America/New_York` |
| `COMMODITIES_SESSION_OPEN` | `09:30` |
| `COMMODITIES_SESSION_CLOSE` | `16:00` |

---

## Validation scripts

| Script | Purpose |
|--------|---------|
| `script:commodities-data-spike` | Print fixture returns for all 24 symbols on a session date |
| `script:commodities-dry-run` | End-to-end contest ranking on fixture prices |
| `script:commodities-local-eval` | Enable sport, init event, refresh fixture data, open eval contest |
