# Commodity Picks — competition brief

**Status:** Approved for implementation.  
**Related:** [data-sources.md](./data-sources.md) · [event-activation-runbook.md](./event-activation-runbook.md) · [add-sport checklist](../../../spec/platform/add-sport-checklist.md)

---

## Type

External

---

## One-liner

Pick three commodities for the trading week; your lineup scores the sum of their five daily legs (asymmetric up/down weighting); highest total wins the contest.

---

## Event unit

| Field | Decision |
|-------|----------|
| **External ID pattern** | ISO week `YYYY-Www` — e.g. `2026-W27` |
| **sportId** | `commodities` |
| **Slug** | `commodities` |
| **Display name** | `Commodity Futures – Week 27` |
| **Session window** | Monday 09:30 ET → Friday 16:30 ET (ISO timestamps in `metadata.commodities`) |
| **Typical duration** | One trading week; `--open`/`--close` overrides for local eval |
| **Active events** | One active commodities event at a time (`CompetitionEvent.isActive`) |
| **SCHEDULED → LIVE** | Cron sets `metadata.commodities.sessionStarted` when `now >= sessionOpen` (same pipeline pass activates contests) |
| **LIVE → COMPLETE** | Cron sets `metadata.commodities.sessionComplete` when `now >= sessionClose` (same pass settles contests) |
| **Init defaults** | Env `COMMODITIES_SESSION_TZ/OPEN/CLOSE` (Mon 9:30 – Fri 16:30 America/New_York) |
| **Init overrides** | `service:init-event commodities 2026-W27 --open +2m --close +62m` (or ISO datetimes) |

**Scoring:** Five daily legs from Hyperliquid marks/candles (see [data-sources.md](./data-sources.md)).

**Out of scope:** Equities, prop bets, automated weekly init cron.

---

## Candidate pool

| Field | Decision |
|-------|----------|
| **Field size** | 8-ticker Hyperliquid HIP-3 allowlist; init filters to liquid markets; frozen per event in `fieldSnapshot` |
| **Roster rules** | 3 slots, flat pool, no duplicates |
| **Field lock timing** | Lineup lock at session open (`LIVE` transition) |
| **DNP policy** | Missing open or close price → **0 points** for that leg |
| **Min picks** | 3 required to submit (`slotCount` / `maxPicks` = 3; `minPicks` = 0 for draft saves, same as golf/F1) |

---

## Scoring

### Five daily rounds

Each trading day (Mon–Fri) is one **round**, always indexed to the ISO week in `externalId` (`sessionDate` = Monday anchor). UI labels (`Mon`…`Fri`), contest timeline dividers, and sparkline columns use this fixed calendar grid.

`sessionOpen` / `sessionClose` gate **eligibility**, not column labels: legs on days before open or after close score 0; the first in-play leg uses the mark at `sessionOpen` as its start price.

Per pick, score each eligible leg's close-to-close % move with **asymmetric weighting**:

| Day move | Fantasy points |
|----------|----------------|
| +2.00% | +20 |
| -2.00% | -8 (40% of linear) |

**Transform:** `points = round(dayPct × 10)` when `dayPct ≥ 0`; else `round(dayPct × 10 × 0.4)`. Raw daily `%` in `scoreData.r1`…`r5.pctReturn`; cumulative raw week move in `scoreData.pctReturn` (display only).

**Round boundaries:** Mon open → Mon close (D1), Mon close → Tue close (D2), … Thu close → Fri close (D5). During LIVE, the active round is provisional (prior close → current mark).

### Per-participant total

`EventParticipant.total` = sum of five round totals (`r1`…`r5`).

### Lineup aggregation

Sum of three commodity totals (platform default aggregation).

### Direction

Higher wins.

### Tie-break prediction

`{ type: "winningLineupTotal", value: number }` — integer guess of the winning lineup total, same scale as lineup scores. Range from `Sport.predictionRules` (no `displayScale`; slider shows integers directly).

| Field | Value |
|-------|-------|
| **Range** | -100 to 250 |
| **defaultRandom** | 40–90 |
| **Label** | Tie-Breaker (winning lineup pts) |

Negative minimum reflects asymmetric loss scoring (lineup totals can be negative).

---

## Curated pool

Static allowlist in `packages/sport-commodities/src/catalog.ts`. Hyperliquid resolves `hlCoin` at init; health filter drops illiquid markets.

| # | Name | Ticker | Sector | iconKey |
|---|------|--------|--------|---------|
| 1 | Crude Oil | CL | energy | crude-oil |
| 2 | Brent Crude | BRENTOIL | energy | brent |
| 3 | Natural Gas | NATGAS | energy | natural-gas |
| 4 | Gold | GOLD | precious | gold |
| 5 | Silver | SILVER | precious | silver |
| 6 | Platinum | PLATINUM | precious | platinum |
| 7 | Palladium | PALLADIUM | precious | palladium |
| 8 | Copper | COPPER | metals | copper |

---

## Data & ops

| Field | Decision |
|-------|----------|
| **Price source** | [Hyperliquid](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint) HIP-3 perps (fixture mode for offline eval) |
| **Refresh** | On init + field sync; 5-minute cron when `ENABLE_CRON=true` |
| **Dry-run target** | `2026-W27` |

---

## Out of scope (v1)

- Prop bets, automated weekly init cron
- Crypto, equities, sector roster constraints
- Sub-minute quotes

---

## DB seed values

```json
{
  "rosterRules": { "slotCount": 3, "minPicks": 0, "maxPicks": 3, "allowDuplicates": false },
  "scoringRules": { "aggregation": "sum", "direction": "higher_wins" },
  "predictionRules": {
    "min": -100,
    "max": 250,
    "defaultRandomMin": 40,
    "defaultRandomMax": 90,
    "label": "Tie-Breaker (winning lineup pts)"
  },
  "isEnabled": false
}
```

Sport is seeded disabled; enable via Prisma Studio or `script:commodities-local-eval` before users see commodities in `GET /api/sports`.
