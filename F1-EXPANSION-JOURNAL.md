# F1 Expansion Journal

Per-stage record of **predicted needs** vs **actual findings** during the F1 race-day plugin effort. This is a process log, not a product spec — authoritative design lives in [F1-EXPANSION-PLAN.md](F1-EXPANSION-PLAN.md) and the competition brief (Stage 1).

Checklist updates triggered by each stage are noted under **Checklist impact**.

---

## Stage template

Copy for each new stage entry:

```markdown
## Stage N — [Name] (YYYY-MM-DD)

### Predicted needs
- ...

### Actual findings
- ...

### Gaps / surprises
- ...

### Checklist impact
- Items added / removed / reprioritized
```

---

## Stage 0 — Docs (2026-06-27)

### Predicted needs

- Platform plugin architecture (`SportModule`, `SportUIPlugin`, cron pipeline) is sufficient for a second sport without schema or contract changes.
- Biggest unknown is **data sourcing** — no F1 API integration exists; Stage 2 spike will determine feasibility, licensing, and live coverage.
- Golf-hardcoded paths in platform code will need cleanup before multi-sport UX is polished (Stage 7).
- **Race-only** v1 scope simplifies lifecycle vs full weekend (no qualifying scoring, single `LIVE` window).
- Work splits cleanly into golf's three layers: `packages/sport-f1/`, `server/src/sports/f1/`, `client/src/sports/f1/`.
- Registries, seed row, and `initEvent` CLI are the wiring points; contests/leagues/wallets/contracts need no changes.

### Actual findings

- **Architecture confirmed:** v4 is designed for multi-sport. `runSportEventPipeline` dispatches to any registered `SportModule` by `sportId`. Only `pga-golf` is registered in `server/src/sports/registry.ts` and `client/src/sports/registry.ts`.
- **No F1 code exists:** zero matches for F1/formula-1 packages, handlers, or seed rows. 100% greenfield for sport-specific code and data plumbing.
- **Fit docs already support F1:** `docs/competition-shape-ideas.md` rates F1 race weekend **Strong fit**; `docs/new-competition-fit-guide.md` reframes championship → race weekends and provides the competition brief template.
- **Golf reference is complete:** 15 files in `packages/sport-pga-golf/src/`, 15 in `server/src/sports/pga-golf/`, 15 in `client/src/sports/pga-golf/` — clear copy target for F1 file structure.
- **Golf leaks identified** in ~9 platform files that import `@cut/sport-pga-golf` or `golfPrediction` directly:
  - `client/src/lib/eventMetadata.ts`
  - `client/src/components/platform/SportPredictionField.tsx`
  - `client/src/lib/lineupApi.ts`
  - `client/src/components/lineup/LineupContestCard.tsx`
  - `client/src/hooks/useLineupSlotEditor.ts` (hardcoded `SLOT_COUNT = 4`)
  - `server/src/services/lineups/createLineupForEvent.ts`
  - `server/src/services/lineups/updateLineupById.ts`
  - `server/src/utils/lineupValidation.ts`
  - `server/src/routes/contest.ts`
- **Multi-sport picker** is DB-driven — enabling a second `Sport` row with `isEnabled: true` surfaces the sport in the UI without routing changes.
- **Prop bets are golf-only** via `propBetRegistry.ts` and DataGolf — correctly out of scope for F1 v1.

### Gaps / surprises

- No reference plugin besides golf (`sport-nfl-fantasy` mentioned in architecture docs but not present in repo).
- `useLineupSlotEditor.ts` hardcodes 4 slots while server validates from `Sport.rosterRules` — UI/server mismatch will affect any sport with non-4 roster size.
- Golf event activation runbook (`docs/event-activation-runbook.md`) is PGA-specific; F1 needs its own runbook (Stage 9).
- Data API choice is entirely open — Ergast useful for historical dry-runs but may not cover live race-day needs.

### Checklist impact

- Created root tracking docs: `F1-EXPANSION-PLAN.md`, `F1-EXPANSION-CHECKLIST.md`, `F1-EXPANSION-JOURNAL.md`.
- Stage 0 checklist items marked complete.
- Platform cleanup file list added to Stage 7 (9 files, expanded from initial ~5 estimate).
- Next: Stage 1 — fill competition brief and score fit worksheet.

---

## Stage 1 — Competition brief (2026-06-27)

### Predicted needs

- Brief would lock race-only scope, roster size, scoring table, and tie-break without needing live API access.
- Fit worksheet would score Mostly Strong with Partial on data (row 7) and possibly live drama (row 10).
- `sportId` `f1` and human-readable `externalId` slug would be simplest ops path.
- Tie-break should mirror golf's winning-lineup-total pattern for minimal platform changes.

### Actual findings

- Brief written at `docs/f1-competition-brief.md` with all template sections filled.
- Fit worksheet: **10 Strong, 2 Partial** (rows 7 data, 10 live drama) — proceed decision recorded.
- **sportId:** `f1`, **slug:** `f1`, **name:** Formula 1.
- **externalId:** `{year}-{circuit-slug}-gp` (e.g. `2026-monaco-gp`).
- **Scoring:** Standard F1 25–18–15… points + fastest-lap bonus (+1 if top 10). Provisional totals during LIVE, final at COMPLETE.
- **Tie-break:** `{ type: "winningLineupPoints", value: 1–120 }` — same ranking order as golf.
- **Dry-run target:** `2024-british-gp` for Ergast-friendly historical replay in Stage 2.
- **DB seed values** documented in brief for Stage 3 (`rosterRules` / `scoringRules` mirror golf structure).
- `F1-EXPANSION-PLAN.md` updated with resolved decisions; data API remains open for Stage 2.

### Gaps / surprises

- Live leaderboard drama (row 10) is Partial because points are provisional until classification — mitigated by showing live **position** in UI between cron refreshes.
- Prediction type is new (`winningLineupPoints` vs golf's `winningScore`) — Stage 7 platform cleanup must handle sport-specific prediction shapes, not just golf.

### Checklist impact

- Stage 1 checklist items marked complete.
- Stage 2 can proceed with concrete `externalId` for spike: `2024-british-gp`.
- Stage 6 `PredictionField` must label slider as lineup points (not Stableford).
- Stage 7 cleanup scope confirmed: prediction parsing must be sport-delegated, not golf-hardcoded.

---

## Stage 2 — Data spike (2026-06-27)

### Predicted needs

- Data API choice would be the main blocker; historical dry-run should work without paid keys.
- Ergast/Jolpica likely sufficient for final results; live may need OpenF1.
- `2024-british-gp` should resolve to season round 12 / Silverstone.
- Field mapping to `Participant.externalId` needs a stable driver key.

### Actual findings

- **Primary API: OpenF1** — free historical access, 20 drivers, `session_result` with points including fastest-lap bonus (Sainz P5 = 11 pts verified).
- **Secondary: Jolpica** (Ergast successor at `api.jolpi.ca`) — schedule and `circuitId` resolution; no live positions.
- Spike script `pnpm --filter server run script:f1-data-spike 2024-british-gp` passes end-to-end.
- Resolved keys: `meeting_key` 1240, race `session_key` 9558, Jolpica round 12.
- **Rate limits:** OpenF1 free tier 3 req/s, 30 req/min — hit 429 during rapid spike calls; fixed with delays + retry in spike script. Cron at 5 min is fine.
- **Driver ID:** OpenF1 `driver_number` per season is stable enough for `Participant.externalId`; store `meetingKey`/`sessionKey` on event metadata.
- **Provisional scoring:** During LIVE use `/position` + position→points table; at COMPLETE use `/session_result.points`.
- Full mapping documented in `docs/f1-data-sources.md`.

### Gaps / surprises

- OpenF1 rate-limits burst requests even on historical data — sync jobs need backoff.
- Circuit slug → `circuitId` map must be maintained manually (spike has starter map in script).
- Live session window requires paid OpenF1 token — not needed for historical dry-run but blocks same-day live prod without subscription.
- Jolpica `points` in raw results omit fastest-lap bonus — must use OpenF1 for final totals.

### Checklist impact

- Stage 2 checklist items marked complete.
- Added `docs/f1-data-sources.md` and `script:f1-data-spike` to resources.
- Stage 5 sync implementation should use OpenF1 with Jolpica fallback for schedule only.
- Stage 5: add rate-limit backoff to all OpenF1 client calls.
