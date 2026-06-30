# Commodity Picks — competition brief

**Status:** Approved for implementation.  
**Related:** [data-sources.md](./data-sources.md) · [event-activation-runbook.md](./event-activation-runbook.md) · [COMMODITIES_JOURNAL.md](../../../COMMODITIES_JOURNAL.md) · [add-sport checklist](../../../spec/platform/add-sport-checklist.md)

---

## Type

External

---

## One-liner

Pick five commodities for today's session; your lineup scores the sum of their % moves; highest total wins the contest.

---

## Event unit

| Field | Decision |
|-------|----------|
| **External ID pattern** | ISO date `YYYY-MM-DD` — e.g. `2026-06-29` (anchor date) |
| **sportId** | `commodities` |
| **Slug** | `commodities` |
| **Session window** | Configurable `sessionOpen` → `sessionClose` (ISO timestamps in `metadata.commodities`) |
| **Typical duration** | One US trading day (~6.5 hours); any duration supported at init |
| **Active events** | One active commodities event at a time (`CompetitionEvent.isActive`) |
| **SCHEDULED → LIVE** | `now >= sessionOpen` |
| **LIVE → COMPLETE** | `now >= sessionClose` |
| **Init defaults** | Env `COMMODITIES_SESSION_TZ/OPEN/CLOSE` (9:30–16:00 America/New_York) |
| **Init overrides** | `service:init-event commodities YYYY-MM-DD --open HH:mm --close HH:mm` (or ISO datetimes) |

**Phase A scoring:** `%` return uses the anchor date's daily OHLC from fixture data (or vendor daily bar when integrated). Custom session bounds control contest lifecycle only until API Ninjas intraday scoring ships.

**Out of scope:** Equities, prop bets, automated daily init cron.

---

## Candidate pool

| Field | Decision |
|-------|----------|
| **Field size** | 24 curated CME-style futures (static catalog) |
| **Roster rules** | 5 slots, flat pool, no duplicates |
| **Field lock timing** | Lineup lock at session open (`LIVE` transition) |
| **DNP policy** | Missing open or close price → **0 points** for that pick |
| **Min picks** | 5 required to submit (`slotCount` / `maxPicks` = 5; `minPicks` = 0 for draft saves, same as golf/F1) |

---

## Scoring

### Per-participant total

Each commodity's `EventParticipant.total` = **% return from session open to current/close**, stored as fixed-point tenths (golf-scale integers).

| Raw move | Display score | Stored `total` |
|----------|---------------|----------------|
| +2.35% | 23.5 | 235 |
| -1.20% | -12.0 | -120 |

**Transform:** `displayScore = pctReturn × 10`; `total = Math.round(displayScore × 10)`. Raw `%` in `scoreData.pctReturn`.

**During LIVE:** `total` is provisional (open → current price). At `COMPLETE`, open → close/settlement is final.

### Lineup aggregation

Sum of five commodity totals (platform default aggregation).

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
| **Dry-run target** | `2025-06-27` |

---

## Out of scope (v1)

- Weekly mode, prop bets, automated daily init cron
- Crypto, equities, sector roster constraints
- Sub-minute quotes

---

## DB seed values

```json
{
  "rosterRules": { "slotCount": 5, "minPicks": 0, "maxPicks": 5, "allowDuplicates": false },
  "scoringRules": { "aggregation": "sum", "direction": "higher_wins" },
  "predictionRules": { "min": -1000, "max": 2500, "defaultRandomMin": 400, "defaultRandomMax": 900 }
}
```
