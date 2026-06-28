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
