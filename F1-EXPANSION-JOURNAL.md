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

---

## Stage 3 — DB + seed (2026-06-27)

### Predicted needs

- No schema migration — `Sport` table already supports JSON `rosterRules` / `scoringRules`.
- Seed values documented in competition brief: 4 required picks (stricter than golf's `minPicks: 0`), same sum/higher-wins scoring.
- `isEnabled: true` surfaces F1 in sport picker before plugins exist (Stage 4–6).

### Actual findings

- Added `F1_ROSTER_RULES` and `F1_SCORING_RULES` constants to `server/prisma/seed.ts` matching brief exactly.
- Upserted `Sport` row: `id: f1`, `name: Formula 1`, `slug: f1`, `isEnabled: true`.
- `pnpm --filter server run db:seed` succeeds; both `pga-golf` and `f1` rows present in local DB.
- F1 differs from golf on `minPicks: 4` (all four drivers required) vs golf's `minPicks: 0` (partial lineups allowed).

### Gaps / surprises

- F1 appears in `GET /sports` and multi-sport picker immediately — routes will fail until Stage 4–6 register server/client plugins. Acceptable on `f1` dev branch; disable via `isEnabled: false` if needed on shared envs.
- No Prisma schema change required — Stage 3 is seed-only as predicted.

### Checklist impact

- Stage 3 checklist items marked complete.
- Stage 4 can read roster/scoring rules from DB or mirror constants in `packages/sport-f1/`.

---

## Stage 4 — Server package (2026-06-27)

### Predicted needs

- Mirror `packages/sport-pga-golf/` structure: pure logic in package, IO injected via `F1Handlers`.
- Status derived from `metadata.f1.raceStart` + `classificationComplete` flag (sync sets flag when `session_result` lands).
- Prediction type `winningLineupPoints` (not golf's `winningScore`).
- Live-scores: provisional from position table during LIVE; final from OpenF1 `session_result.points`.
- Sort keys per brief: championship → grid → constructor → name (picker); race position → points (active).

### Actual findings

- Created `@cut/sport-f1` workspace package with 11 source files + 4 test files.
- `createF1Module(handlers)` implements full `SportModule` contract; no prop-bet module (out of scope).
- `f1ShouldSyncLiveScores` returns true for both LIVE and COMPLETE (final classification pass).
- `transformSessionResult` splits finish vs bonus points from API total (Sainz P5 = 10 + 1 verified in tests).
- 22 unit tests pass; package builds via `pnpm --filter @cut/sport-f1 run build`.

### Gaps / surprises

- Event metadata nested under `metadata.f1` (not flat) — server sync must write this shape at Stage 5.
- `classificationComplete` boolean required on metadata for COMPLETE transition; time alone is insufficient after race end.
- No prop-bet exports — correctly omitted vs golf package.

### Checklist impact

- Stage 4 checklist items marked complete.
- Stage 5 should add `@cut/sport-f1` to `server/package.json` and wire handlers + OpenF1 client.
- Stage 6 client plugin can import `f1CandidateSortConfig` from this package.

---

## Stage 5 — Server IO (2026-06-27)

### Predicted needs

- Mirror `server/src/sports/pga-golf/` IO layer: handlers inject Prisma + OpenF1/Jolpica calls into `createF1Module`.
- Shared OpenF1 client with spike's retry/backoff and circuit slug map.
- `initEvent` resolves externalId → creates event with `metadata.f1` block → syncs metadata + field → activates.
- Cron pipeline works automatically once module is registered (no cron changes needed).

### Actual findings

- Created `server/src/sports/f1/` with 12 files: `openf1Client.ts`, `circuitSlugs.ts`, `metadataMerge.ts`, sync modules, handlers, CLI runners.
- Registered `f1Module` in `server/src/sports/registry.ts`; added `@cut/sport-f1` server dependency.
- `pnpm --filter server run service:init-event f1 2024-british-gp` succeeds: 20 drivers, `isActive: true`, `classificationComplete: true` for historical race.
- `service:sync-f1-scores` syncs all 20 participants from `session_result`.
- Field sync enriches grid + championship positions from OpenF1 `starting_grid` / `championship_drivers` when available.
- Documented `OPENF1_API_TOKEN` and `JOLPICA_BASE_URL` in `server/.env.example`; updated Dockerfile + deploy script for `@cut/sport-f1` build.

### Gaps / surprises

- OpenF1 burst calls during field sync (drivers + grid + championship in parallel) may 429 — client retries handle it; consider serializing if prod issues arise.
- Init does not call `syncLiveScores` — scores populate on first cron pass or manual `service:sync-f1-scores` (same as golf pattern where init syncs field only).
- F1 sport visible in picker but client plugin still missing (Stage 6).

### Checklist impact

- Stage 5 checklist items marked complete.
- Stage 6 client UI plugin is next.
- Stage 7 platform cleanup still required for `winningLineupPoints` prediction type.

---

## Stage 6 — Client plugin (2026-06-27)

### Predicted needs

- Mirror golf UI plugin structure: CandidateRow, ParticipantRow, ParticipantDetail, PredictionField, EventSummary.
- `f1CandidateSortConfig` imported from `@cut/sport-f1` package (shared with server).
- Prediction slider range 1–120 (`winningLineupPoints`).
- Team colour stripe, grid/championship in picker, position + points in live rows.
- Register in `client/src/sports/registry.ts`; add `@cut/sport-f1` client dependency.

### Actual findings

- Created `client/src/sports/f1/` with 11 files + `client/src/lib/f1Prediction.ts`.
- `f1UIPlugin` registered alongside golf; client build passes.
- Minimal `eventMetadata.ts` update for F1 status/start date (needed for leaderboard live layout — partial Stage 7).
- `SportPredictionField` already delegates to plugin `PredictionField` — F1 slider works in F1 contest context without further changes.
- Circuit hero images via `eventMedia.ts` map + Unsplash fallback.

### Gaps / surprises

- `LineupContestCard` / `lineupApi` still golf-hardcoded for prediction serialization (Stage 7).
- `useLineupSlotEditor` still hardcodes 4 slots (Stage 7).
- Leaderboard `playerId` URL param is golf-named (`pgaTourId`) — works via generic `playerId` but naming is golf-centric.
- No Storybook stories for F1 components (optional).

### Checklist impact

- Stage 6 checklist items marked complete.
- Stage 7 remains: lineup API, slot editor, contest tie-break display, remaining golf leaks.
- Stage 8 dry-run can proceed after Stage 7 or with known prediction gaps.

---

## Stage 7 — Platform cleanup (2026-06-28)

### Predicted needs

- ~9 platform files hardcode golf prediction (`winningScore`) or golf event status.
- F1 uses `winningLineupPoints` (1–120); golf uses `winningScore` (1–250).
- Slot editor hardcoded 4 slots; F1 seed has `minPicks: 4` same count but should read `rosterRules` from DB.
- `SportPredictionField` already delegated to plugin — needed sport-aware fallback only.

### Actual findings

- Added `server/src/utils/sportPrediction.ts` and `client/src/lib/sportPrediction.ts` as shared sport-dispatch layer.
- Server: `createLineupForEvent`, `updateLineupById`, `lineupValidation`, `contest` route use sport-aware or dual-type prediction parsing.
- Client: `lineupApi`, `lineupUtils`, `LineupContestCard`, `ContestEntryModal`, `useLineupMutations` updated; no direct `golfPrediction` in platform lineup flow.
- `useLineupSlotEditor` accepts `slotCount` from new `useSportRosterRules(sportId)` hook (reads `GET /sports`).
- `eventMetadata.ts` already had F1 status from Stage 6 — confirmed complete.
- Onboarding/FAQ: no blocking golf-only copy in lineup/contest flows; sport picker is DB-driven.

### Gaps / surprises

- Parameter name `winningScorePrediction` kept across API for backward compat — value maps to correct JSON type per sport.
- `lineupApi` defaults to `pga-golf` if `sportId` omitted — callers should pass sportId (mutations use EventScope).
- `adminEventContext.ts` still golf-specific — admin only, out of scope.

### Checklist impact

- Stage 7 checklist items marked complete (journal pending).
- Stage 8 dry-run: create F1 lineup + contest end-to-end should work.
