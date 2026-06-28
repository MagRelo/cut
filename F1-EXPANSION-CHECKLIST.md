# F1 Expansion Checklist

Running list of resources and steps for the F1 race-day plugin. Narrative and rationale: [F1-EXPANSION-PLAN.md](F1-EXPANSION-PLAN.md). Stage journal: [F1-EXPANSION-JOURNAL.md](F1-EXPANSION-JOURNAL.md).

---

## Resources

### Reference implementation (PGA Golf)

| Resource | Path |
|----------|------|
| Sport package | `packages/sport-pga-golf/` |
| Server handlers & sync | `server/src/sports/pga-golf/` |
| Client UI plugin | `client/src/sports/pga-golf/` |
| Server registry | `server/src/sports/registry.ts` |
| Client registry | `client/src/sports/registry.ts` |
| Prop bet registry (optional) | `server/src/sports/propBetRegistry.ts` |
| DB seed | `server/prisma/seed.ts` |
| Event init service | `server/src/services/initEvent.ts` |
| Cron pipeline | `server/src/services/cron/runSportEventPipeline.ts` |
| Golf activation runbook | `docs/event-activation-runbook.md` |

### Plugin contracts

| Resource | Path |
|----------|------|
| `SportModule` | `packages/sport-sdk/src/sport-module.ts` |
| `SportUIPlugin` | `packages/sport-sdk/src/sport-ui-plugin.ts` |
| Shared types | `packages/sport-sdk/src/types.ts` |
| Candidate sort helper | `packages/sport-sdk/src/candidateSort.ts` |
| Plugin spec | `spec/platform/plugins.md` |
| Client UI plugin spec | `spec/client/sport-ui-plugins.md` |

### Platform specs

| Resource | Path |
|----------|------|
| Platform overview | `spec/platform/README.md` |
| Data models | `spec/server/data-models.md` |
| Cron | `spec/server/cron.md` |
| Cross-layer flows | `spec/cross-layer.md` |
| Fit guide | `docs/new-competition-fit-guide.md` |
| Competition brief template | `docs/new-competition-fit-guide.md` (Competition brief template section) |

### Data source candidates (Stage 2 — TBD)

| Candidate | Notes |
|-----------|-------|
| **OpenF1** | **Primary (chosen)** — see [docs/f1-data-sources.md](docs/f1-data-sources.md) |
| Jolpica (Ergast) | Schedule / slug resolution secondary |
| Official F1 API | Not evaluated |

### Environment / secrets (Stage 2+)

- [ ] `OPENF1_API_TOKEN` — optional for historical; required for live session window
- [ ] `JOLPICA_BASE_URL` — optional override (default `https://api.jolpi.ca/ergast/f1`)
- [ ] Document in server `.env.example` at Stage 5

---

## Stage 0 — Docs

- [x] Create `F1-EXPANSION-PLAN.md`
- [x] Create `F1-EXPANSION-CHECKLIST.md`
- [x] Create `F1-EXPANSION-JOURNAL.md`
- [x] Write Stage 0 journal entry

---

## Stage 1 — Competition brief

- [x] Copy competition brief template from `docs/new-competition-fit-guide.md`
- [x] Save filled brief — `docs/f1-competition-brief.md`
- [x] Score 12-row fit worksheet (rows 1–12)
- [x] Confirm event unit: race day only
- [x] Confirm `externalId` pattern — `{year}-{circuit-slug}-gp`
- [x] Confirm `sportId` — `f1`
- [x] Confirm roster size and rules — 4 drivers, flat pool, no duplicates
- [x] Confirm scoring table — standard F1 finish points + fastest-lap bonus
- [x] Confirm DNS/DNF/DSQ policy — zero points
- [x] Confirm tie-break prediction — `winningLineupPoints`, range 1–120
- [x] Confirm `SCHEDULED → LIVE → COMPLETE` triggers — race start / official classification
- [x] Confirm picker sort keys — championship → grid → constructor → name
- [x] Confirm target race for dry-run — `2024-british-gp` (historical replay)
- [x] Write Stage 1 journal entry

---

## Stage 2 — Data spike

- [x] Evaluate data source candidates (schedule, entry list, live results, final classification)
- [x] Document licensing, rate limits, and terms — `docs/f1-data-sources.md`
- [x] Choose primary data API — OpenF1 (+ Jolpica for schedule resolution)
- [x] Spike script: fetch one race schedule — `server/src/scripts/f1DataSpike.ts`
- [x] Spike script: fetch entry list (~20 drivers)
- [x] Spike script: fetch live or final race results
- [x] Map API fields → `Participant`, `EventParticipant.scoreData`, `EventParticipant.total`
- [x] Document env vars and auth
- [x] Write Stage 2 journal entry

---

## Stage 3 — DB + seed

- [x] Define `F1_ROSTER_RULES` JSON (slot count, pool constraints)
- [x] Define `F1_SCORING_RULES` JSON (`aggregation: sum`, `direction: higher_wins`)
- [x] Add `Sport` row to `server/prisma/seed.ts` (`id: f1`, `slug`, `isEnabled`)
- [x] Run seed / verify `Sport` row in local DB
- [x] Write Stage 3 journal entry

---

## Stage 4 — Server package (`packages/sport-f1/`)

- [x] Create package scaffold (`package.json`, `tsconfig`, workspace reference)
- [x] `create-module.ts` — factory `createF1Module(handlers)` → `SportModule`
- [x] `status.ts` — `SCHEDULED | LIVE | COMPLETE` from race metadata
- [x] `metadata.ts` — typed metadata + prediction parsing
- [x] `candidates.ts` — `buildF1Candidates()` + sort keys
- [x] `candidateSort.ts` — `f1CandidateSortConfig`
- [x] `validation.ts` — roster validation against `RosterRules`
- [x] `ranking.ts` — `rankEntries` with F1 prediction tie-break
- [x] `live-scores.ts` — transform API results → `scoreData` + `total`
- [x] `index.ts` — public exports
- [x] Unit tests for status, ranking, validation, live-scores
- [x] Write Stage 4 journal entry

---

## Stage 5 — Server IO (`server/src/sports/f1/`)

- [x] `handlers.ts` — Prisma + API injection for module factory
- [x] `initEvent.ts` — create `CompetitionEvent`, sync field, set active, deactivate prior F1 event
- [x] `syncMetadata.ts` — circuit, race time, status
- [x] `syncField.ts` — drivers → `Participant` + `EventParticipant`
- [x] `syncLiveScores.ts` — live positions / final points during race
- [x] `runSyncMetadata.ts`, `runSyncField.ts`, `runSyncScores.ts` — CLI runners (if needed)
- [x] Register module in `server/src/sports/registry.ts`
- [x] Verify `pnpm run service:init-event f1 <externalId>` end-to-end
- [x] Write Stage 5 journal entry

---

## Stage 6 — Client plugin (`client/src/sports/f1/`)

- [ ] `index.tsx` — `f1UIPlugin` registration object
- [ ] `CandidateRow.tsx` — team colors, grid position, constructor
- [ ] `ParticipantRow.tsx` — live position, points during race
- [ ] `ParticipantDetail.tsx` — race stats (not golf scorecard)
- [ ] `PredictionField.tsx` — F1 tie-break input
- [ ] `EventSummary.tsx` — circuit / race hero
- [ ] `eventMedia.ts` or `resolveEventHeroImage` — circuit imagery
- [ ] `candidateSortConfig` aligned with server `sortKeys`
- [ ] Register in `client/src/sports/registry.ts`
- [ ] Verify sport hub (`/sports/f1`) and leaderboard render
- [ ] Write Stage 6 journal entry

---

## Stage 7 — Platform cleanup

- [ ] `client/src/lib/eventMetadata.ts` — sport-aware event status (not golf-only)
- [ ] `client/src/components/platform/SportPredictionField.tsx` — delegate to sport UI plugin
- [ ] `client/src/lib/lineupApi.ts` — sport-aware prediction serialization
- [ ] `client/src/components/lineup/LineupContestCard.tsx` — remove direct golf prediction imports
- [ ] `client/src/hooks/useLineupSlotEditor.ts` — read slot count from `rosterRules`
- [ ] `server/src/services/lineups/createLineupForEvent.ts` — sport-aware prediction parsing
- [ ] `server/src/services/lineups/updateLineupById.ts` — sport-aware prediction parsing
- [ ] `server/src/utils/lineupValidation.ts` — sport-aware prediction parsing
- [ ] `server/src/routes/contest.ts` — sport-aware tie-break display
- [ ] Audit onboarding/FAQ copy for golf-only language (optional for v1)
- [ ] Write Stage 7 journal entry

---

## Stage 8 — Dry run

- [ ] Pick target race (`externalId` from brief)
- [ ] `pnpm run service:init-event f1 <externalId>`
- [ ] Confirm `CompetitionEvent.isActive = true`
- [ ] Confirm field sync (~20 drivers in candidate pool)
- [ ] Create test lineup (4 drivers + prediction)
- [ ] Create test contest on F1 event
- [ ] Enable cron (`ENABLE_CRON=true`); verify live score updates during race or replay
- [ ] Verify contest activates at `LIVE`, settles at `COMPLETE`
- [ ] Verify leaderboard ranking and tie-break
- [ ] Write Stage 8 journal entry

---

## Stage 9 — Ops runbook

- [ ] Create `docs/f1-event-activation-runbook.md` (mirror golf runbook structure)
- [ ] Document `externalId` lookup source
- [ ] Document init command and prerequisites
- [ ] Document env vars for data API
- [ ] Optional: event preview JSON pipeline (golf uses `server/src/tournamentSummaries/`)
- [ ] Optional: email blast hooks for new F1 race
- [ ] Write Stage 9 journal entry

---

## Out of scope (v1)

- [ ] Qualifying session scoring
- [ ] Sprint race weekends as separate scoring
- [ ] Full race weekend (qualifying + race) as one event
- [ ] Championship / season standings
- [ ] Prop bets / side bets (`PropBetModule`)
- [ ] Constructor or team-based roster slots
- [ ] Sub-minute live timing / websocket feed
- [ ] Multi-event overlap (one active F1 event at a time only)
