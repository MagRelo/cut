# F1 Race Day — competition brief

**Status:** Stage 1 approved for implementation spike.  
**Related:** [data-sources.md](./data-sources.md) · [event-activation-runbook.md](./event-activation-runbook.md) · [add-sport checklist](../../../spec/platform/add-sport-checklist.md)

---

## Type

External

---

## One-liner

Pick four drivers for this week's Grand Prix; your lineup scores the sum of their race-day points (finish position + fastest-lap bonus); highest total wins the contest.

---

## Event unit

| Field | Decision |
|-------|----------|
| **External ID pattern** | OpenF1 Race `session_key` — e.g. `9558` (2024 British GP). Lookup: `script:f1-list-races {year}` |
| **sportId** | `f1` |
| **Slug** | `f1` |
| **Typical duration** | ~2 hours (single race session) |
| **Active events** | One active F1 event at a time (`CompetitionEvent.isActive`) |
| **SCHEDULED → LIVE** | Race scheduled start time (UTC from data API) |
| **LIVE → COMPLETE** | Official race classification published (final standings, penalties applied) |

**v1 scope:** Race day only. Qualifying, sprint shootout, and practice sessions are not scored.

---

## Candidate pool

| Field | Decision |
|-------|----------|
| **Typical field size** | ~20 drivers (current grid) |
| **Roster rules** | 4 slots, flat pool, no position constraints, no duplicate drivers |
| **Field lock timing** | Lineup lock at race start (`LIVE` transition) — same as golf at tee-off |
| **Withdrawal / DNP policy** | DNS, DNF, DSQ, or driver removed from entry list before lock → **0 points** for that pick. No late replacements after user locks. |
| **Min picks** | 4 required to submit (mirror golf `minPicks` / `maxPicks` = 4) |

---

## Scoring

### Per-participant total

Each driver's `EventParticipant.total` = **race finish points** + **fastest-lap bonus** (if eligible).

**Finish points** (standard F1 race points):

| Position | Points |
|----------|--------|
| 1 | 25 |
| 2 | 18 |
| 3 | 15 |
| 4 | 12 |
| 5 | 10 |
| 6 | 8 |
| 7 | 6 |
| 8 | 4 |
| 9 | 2 |
| 10 | 1 |
| 11+ | 0 |

**Fastest-lap bonus:** +1 point if the driver set the fastest lap **and** finished in the top 10.

**During LIVE (before classification):** `total` may reflect **provisional** points from current running position; recalculated each cron pass. At `COMPLETE`, totals are final per official classification.

`scoreData` stores structured detail for UI: `{ position, status, fastestLap, finishPoints, bonusPoints, ... }`.

### Lineup aggregation

Sum of four driver totals (default platform aggregation).

### Direction

Higher wins.

### Tie-break prediction

Same platform mechanic as golf: user submits a guess at the **winning lineup's total points** in the contest.

| Field | Value |
|-------|-------|
| **JSON shape** | `{ type: "winningLineupTotal", value: number }` |
| **Range** | 1–120 (UI slider; max realistic ≈ 4 × 26 = 104 if four top-four finishers with fastest-lap bonuses) |
| **Ranking** | Score desc → prediction distance to `max(contest scores)` asc → entry time asc |

---

## Data & ops

| Field | Decision |
|-------|----------|
| **Field source** | External API (chosen in Stage 2 spike) |
| **Live scoring source** | Same API — provisional positions during race, final classification at end |
| **Refresh expectations** | 5-minute cron; sufficient for position drama during race |
| **Known gaps / manual ops** | Data API unchosen until Stage 2. Stewards' post-race penalties may delay `COMPLETE` — follow API's "final" flag. |

**Dry-run target:** OpenF1 session_key `9558` (2024 British GP). Lookup: `script:f1-list-races 2024`.

---

## Promotion

| Field | Decision |
|-------|----------|
| **Hook** | "This week's Grand Prix" — same weekly rhythm as golf during F1 season (~24 races/year) |
| **Repeat cadence** | One race per active event; new `externalId` each race week |
| **Leagues** | Cross-sport leagues can run golf + F1 contests in the same group |

---

## UX notes

### Picker sort keys (`picker` context — pre-race / SCHEDULED)

1. Championship standings position (asc — P1 first)
2. Grid position for this race (asc)
3. Constructor name (asc)
4. Driver name (asc)

### Field / lineup list sort keys

| Context | Key order |
|---------|-----------|
| **scheduled** (pre-race) | Grid position → championship → name |
| **active** (LIVE / COMPLETE) | Race position → points (desc) → grid position → name |

### Live display (per pick)

- Race position (P1, P2, …)
- Running / final points
- Status label: Running, Finished, DNF, DSQ
- Constructor + team color in row chrome
- Optional detail: laps completed, pit stops (if API provides)

### Fun factor

Users already run informal F1 pools. Four-driver rosters keep picks quick; constructor colors and grid order make the picker scannable without deep F1 knowledge.

---

## Fit worksheet

Scored against [fit-guide.md](../../competitions/fit-guide.md) evaluation worksheet.

| # | Question | Answer | Notes |
|---|----------|--------|-------|
| 1 | Clear event? | **Strong** | Named Grand Prix race with start time and classification |
| 2 | Bounded field? | **Strong** | ~20 drivers on entry list |
| 3 | One score per participant? | **Strong** | Points total collapses to one number |
| 4 | Simple aggregation? | **Strong** | Sum of four driver points |
| 5 | Obvious winner? | **Strong** | Higher wins; prediction tie-break |
| 6 | Weekly/daily cadence? | **Strong** | ~24 races/season; one active race per week in season |
| 7 | Can we get the data? | **Partial** | No integration yet; Stage 2 spike required |
| 8 | Withdrawal / DNP rule? | **Strong** | Zero points for DNS/DNF/DSQ |
| 9 | Fun picker at 4–12 picks? | **Strong** | 20-driver pool, pick 4 |
| 10 | Live leaderboard drama? | **Partial** | Positions move live; points provisional until classified — position labels carry drama between refreshes |
| 11 | Open before / settle after? | **Strong** | Enter before race start; settle within hours of classification |
| 12 | Leagues make sense? | **Strong** | Recurring friend pools; cross-sport leagues supported |

**Decision:** Mostly Strong — proceed. Stage 2 must resolve row 7 (data sourcing). Row 10 acceptable with live position display.

---

## DB seed values (Stage 3)

```json
// rosterRules
{
  "slotCount": 4,
  "minPicks": 4,
  "maxPicks": 4,
  "allowDuplicates": false
}

// scoringRules
{
  "aggregation": "sum",
  "direction": "higher_wins"
}
```

```json
// Sport row
{
  "id": "f1",
  "name": "Formula 1",
  "slug": "f1",
  "isEnabled": true
}
```

---

## Out of scope (v1)

- Qualifying or sprint session scoring
- Full race weekend (qualifying + race) as one event
- Championship / season-long standings in the app
- Constructor or team-based roster slots
- Prop bets / side bets
- Sub-minute live timing (websocket)
- Multiple overlapping F1 events
- Driver substitutions after lineup lock
