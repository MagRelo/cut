# Commodity Picks — competition brief

**Status:** Approved for implementation.  
**Related:** [data-sources.md](./data-sources.md) · [event-activation-runbook.md](./event-activation-runbook.md) · [COMMODITIES_JOURNAL.md](../../../COMMODITIES_JOURNAL.md) · [add-sport checklist](../../../spec/platform/add-sport-checklist.md)

---

## Type

External

---

## One-liner

Pick three commodities for the trading week; your lineup scores the sum of their % moves; highest total wins the contest.

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

**Scoring:** `%` return uses Hyperliquid mark/candle at `sessionOpen` and `sessionClose` (see [data-sources.md](./data-sources.md)).

**Out of scope:** Equities, prop bets, automated weekly init cron.

---

## Candidate pool

| Field | Decision |
|-------|----------|
| **Field size** | ~14 Hyperliquid HIP-3 perps (static allowlist; frozen per event in `fieldSnapshot`) |
| **Roster rules** | 3 slots, flat pool, no duplicates |
| **Field lock timing** | Lineup lock at session open (`LIVE` transition) |
| **DNP policy** | Missing open or close price → **0 points** for that pick |
| **Min picks** | 3 required to submit (`slotCount` / `maxPicks` = 3; `minPicks` = 0 for draft saves, same as golf/F1) |

---

## Scoring

### Five daily rounds

Each trading day (Mon–Fri) is one **round**. Per pick, score the session’s close-to-close % move with **asymmetric weighting**:

| Day move | Fantasy points |
|----------|----------------|
| +2.00% | +20.0 |
| -2.00% | -8.0 (40% of linear) |

**Transform:** `displayScore = dayPct × 10` when `dayPct ≥ 0`; else `dayPct × 10 × 0.4`. Stored as fixed-point tenths (same as golf). Raw daily `%` in `scoreData.r1`…`r5.pctReturn`; cumulative raw week move in `scoreData.pctReturn` (display only).

**Round boundaries:** Mon open → Mon close (D1), Mon close → Tue close (D2), … Thu close → Fri close (D5). During LIVE, the active round is provisional (prior close → current mark).

### Per-participant total

`EventParticipant.total` = sum of five round totals (`r1`…`r5`).

### Lineup aggregation

Sum of three commodity totals (platform default aggregation).

### Direction

Higher wins.

### Tie-break prediction

`{ type: "winningLineupTotal", value: number }` in fixed-point (same scale as lineup totals). UI slider shows `value / 10` with one decimal.

| Field | Value |
|-------|-------|
| **Range (fixed-point)** | -1000 to 2500 (display -100.0 to 250.0) |
| **defaultRandom** | 400–900 (display 40.0–90.0) |

---

## Curated pool

| # | Name | Symbol | Sector |
|---|------|--------|--------|
| 1 | Crude Oil | CL=F | energy |
| 2 | Brent Crude | BZ=F | energy |
| 3 | Natural Gas | NG=F | energy |
| 4 | Heating Oil | HO=F | energy |
| 5 | Gasoline | RB=F | energy |
| 6 | Gold | GC=F | precious |
| 7 | Silver | SI=F | precious |
| 8 | Copper | HG=F | metals |
| 9 | Platinum | PL=F | precious |
| 10 | Aluminum | ALI=F | metals |
| 11 | Nickel | NI=F | metals |
| 12 | Lead | LED=F | metals |
| 13 | Zinc | ZNC=F | metals |
| 14 | Wheat | ZW=F | ag |
| 15 | Corn | ZC=F | ag |
| 16 | Soybeans | ZS=F | ag |
| 17 | Lumber | LBS=F | ag |
| 18 | Lean Hogs | HE=F | ag |
| 19 | Rice | ZR=F | ag |
| 20 | Oats | ZO=F | ag |
| 21 | Cotton | CT=F | softs |
| 22 | Coffee | KC=F | softs |
| 23 | Sugar | SB=F | softs |
| 24 | Cocoa | CC=F | softs |

---

## Data & ops

| Field | Decision |
|-------|----------|
| **Price source** | Deterministic fixture data (`fixtureMarketData.ts`) until vendor API is integrated |
| **Refresh** | On init + field sync; 5-minute cron when `ENABLE_CRON=true` |
| **Dry-run target** | `2026-W27` |

---

## Out of scope (v1)

- Weekly mode, prop bets, automated daily init cron
- Crypto, equities, sector roster constraints
- Sub-minute quotes

---

## DB seed values

```json
{
  "rosterRules": { "slotCount": 3, "minPicks": 0, "maxPicks": 3, "allowDuplicates": false },
  "scoringRules": { "aggregation": "sum", "direction": "higher_wins" },
  "predictionRules": { "min": -1000, "max": 2500, "defaultRandomMin": 400, "defaultRandomMax": 900 }
}
```
