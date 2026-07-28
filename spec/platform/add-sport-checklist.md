# Add a sport — implementation checklist

Forward-looking steps for shipping a new sport plugin on the v4 platform. Use this as the primary agent runbook; treat per-sport expansion journals as optional historical notes, not the source of truth.

**Contracts:** [plugins.md](plugins.md) · **Architecture:** [docs/platform/architecture.md](../../docs/platform/architecture.md) · **Fit evaluation:** [docs/competitions/fit-guide.md](../../docs/competitions/fit-guide.md)

**Reference implementations:**

| Layer | Golf | F1 | Commodities |
|-------|------|-----|-------------|
| Package | `packages/sport-pga-golf/` | `packages/sport-f1/` | `packages/sport-commodities/` |
| Server IO | `server/src/sports/pga-golf/` | `server/src/sports/f1/` | `server/src/sports/commodities/` |
| Client UI | `client/src/sports/pga-golf/` | `client/src/sports/f1/` | `client/src/sports/commodities/` |
| Activation runbook | `docs/sports/golf/event-activation-runbook.md` | `docs/sports/f1/event-activation-runbook.md` | `docs/sports/commodities/event-activation-runbook.md` |

Contests, leagues, wallets, referrals, and on-chain contracts require **no changes** for a new sport.

---

## Phase 0 — Fit and brief

- [ ] Score the [12-row fit worksheet](../../docs/competitions/fit-guide.md#evaluation-worksheet); record proceed / pivot / pass
- [ ] Write a competition brief at `docs/sports/<id>/competition-brief.md` using the [brief template](../../docs/competitions/fit-guide.md#competition-brief-template)
- [ ] Lock **`sportId`** and URL **slug** (stable forever — used in DB, routes, registries)
- [ ] Lock **`externalId`** pattern and operator lookup flow (each sport uses its source API’s native ID; document the init command)
- [ ] Lock **event unit** (one `CompetitionEvent` instance = what users compete on this week)
- [ ] Lock **lifecycle triggers** (`SCHEDULED → LIVE → COMPLETE`)
- [ ] Lock **roster rules** (`slotCount`, `minPicks`, `maxPicks`, `allowDuplicates`, pool constraints)
- [ ] Lock **scoring rules** (`aggregation`, `direction`, per-participant score definition)
- [ ] Lock **tie-break prediction** range (`Sport.predictionRules`: `min`, `max`, random defaults)
- [ ] Lock **candidate sort keys** for picker, field leaderboard, and lineup picks
- [ ] Pick a **dry-run target** `externalId` (historical replay preferred for first end-to-end test)
- [ ] List **v1 scope** and **out of scope** explicitly in the brief

---

## Phase 1 — Data spike

- [ ] Evaluate data sources: schedule, field/entry list, live state, final results
- [ ] Document chosen APIs, field mapping, rate limits, and auth in `docs/sports/<id>/data-sources.md`
- [ ] Add a spike script at `server/src/scripts/<sport>DataSpike.ts` and register `script:<sport>-data-spike` in `server/package.json`
- [ ] Spike proves: resolve `externalId` → fetch field → fetch live or final scores for the dry-run target
- [ ] Map API fields → `Participant.externalId`, `EventParticipant.scoreData`, `EventParticipant.total`, `CompetitionEvent.metadata`
- [ ] Add an ops lookup helper if `externalId` is not human-obvious (e.g. `script:f1-list-races`)
- [ ] Document env vars in `server/.env.example`
- [ ] Add retry/backoff for rate-limited APIs in the shared client used by sync jobs

---

## Phase 2 — Database seed

- [ ] Add `<SPORT>_ROSTER_RULES`, `<SPORT>_SCORING_RULES`, `<SPORT>_PREDICTION_RULES` to `server/prisma/seed.ts`
- [ ] Include `scoringRules.popularity` (`weight: 0` unless this sport uses path-1 popularity adjustment — [consensus-axis.md](../../docs/platform/consensus-axis.md))
- [ ] Upsert `Sport` row: `id`, `name`, `slug`, `isEnabled`, `rosterRules`, `scoringRules`, `predictionRules`
- [ ] Run `pnpm --filter server run db:seed` and verify `GET /api/sports` returns the new sport
- [ ] Set `isEnabled: false` until server + client plugins are registered if deploying to a shared environment early

No Prisma schema migration is required unless the sport needs new platform columns (rare).

---

## Phase 3 — Server package (`packages/sport-<id>/`)

Pure logic only — no Prisma, no `fetch`, no env vars.

- [ ] Scaffold package (`package.json`, `tsconfig.json`, workspace references)
- [ ] `create-module.ts` — `create<Sport>Module(handlers)` → `SportModule`
- [ ] `status.ts` — derive `SCHEDULED | LIVE | COMPLETE` from event metadata
- [ ] `metadata.ts` — typed `CompetitionEvent.metadata` shape + helpers
- [ ] `candidates.ts` — `build*Candidates()` with `sortKeys` on each row
- [ ] `candidateSort.ts` — export `*CandidateSortConfig` for the UI plugin
- [ ] `validation.ts` — roster validation against `RosterRules`
- [ ] `ranking.ts` — `rankEntries` with `winningLineupTotal` tie-break (`@cut/sport-sdk`)
- [ ] `live-scores.ts` — transform API results → `scoreData` + `total`
- [ ] `index.ts` — public exports
- [ ] Unit tests: status, validation, ranking, live-scores
- [ ] `pnpm --filter @cut/<package> test` and `build` pass

---

## Phase 4 — Server IO (`server/src/sports/<id>/`)

- [ ] `handlers.ts` — inject Prisma + external API calls into the package factory
- [ ] `externalId.ts` (or equivalent) — parse and validate the sport’s `externalId` format
- [ ] `open*Client.ts` (or equivalent) — shared API client with retry/backoff
- [ ] `initEvent.ts` — resolve `externalId`, create `CompetitionEvent`, write metadata, sync field, set `isActive`, deactivate prior event for this sport
- [ ] `syncMetadata.ts` — dates, status flags, event name/circuit context
- [ ] `syncField.ts` — candidates → `Participant` + `EventParticipant`
- [ ] `syncLiveScores.ts` — live/final scores during cron
- [ ] `metadataMerge.ts` — merge API refreshes into existing metadata without dropping fields
- [ ] Optional CLI runners: `runSyncMetadata.ts`, `runSyncField.ts`, `runSyncScores.ts`
- [ ] Register module in `server/src/sports/registry.ts`
- [ ] Register event-status adapter in `server/src/sports/eventStatusRegistry.ts`
- [ ] Add `@cut/sport-<id>` to `server/package.json`; update Dockerfile/deploy build if needed
- [ ] Verify: `pnpm --filter server run service:init-event <sportId> <externalId>`
- [ ] Run `pnpm run check:sport-boundary` — platform paths must not import the new sport package

`initEvent` syncs the field; scores populate on the first cron pass or manual score sync (same pattern as golf).

---

## Phase 5 — Client UI plugin (`client/src/sports/<id>/`)

- [ ] `index.tsx` — export `*UIPlugin` implementing `SportUIPlugin`
- [ ] `CandidateRow.tsx` — picker row (scheduled state)
- [ ] `ParticipantRow.tsx` — leaderboard / lineup slot row (live + complete)
- [ ] `ParticipantDetail.tsx` — detail modal content
- [ ] `PredictionField.tsx` — tie-break slider using `useSportPredictionRules(sportId)`
- [ ] `EventSummary.tsx` (+ optional `EventDetails.tsx`, `eventMedia.ts`) — sport hub and contest hero UI (not editorial Cutbot commentary)
- [ ] Import `*CandidateSortConfig` from the sport package; attach to the UI plugin
- [ ] Register in `client/src/sports/registry.ts`
- [ ] Add `@cut/sport-<id>` to `client/package.json`
- [ ] Verify: `/sports/<sportId>` hub, leaderboard, lineup builder, and contest lobby render

Platform shell components (`SportEventHeader`, `CandidatePicker`, `SportParticipantRow`, `SportPredictionField`) delegate to the plugin — do not fork platform layout.

`EventSummary.tsx` is the hub/hero React component. Contest Cutbot commentary (`Contest.commentary` / `commentaryFeed`) is a separate optional track — see Phase 8.

---

## Phase 6 — Platform integration

Verify the new sport works through shared platform paths (pass `sportId` from `EventScope` everywhere):

- [ ] `client/src/lib/eventMetadata.ts` — status labels and start date for the new metadata shape
- [ ] `client/src/hooks/useLineupSlotEditor.ts` + `useSportRosterRules` — slot count from DB rules
- [ ] `client/src/lib/lineupApi.ts` — lineup create/update passes `sportId`; prediction serializes as `{ type: "winningLineupTotal", value }`
- [ ] `client/src/components/platform/SportPredictionField.tsx` — plugin `PredictionField` renders for the sport
- [ ] Server lineup services use `parseLineupPrediction` + `Sport.predictionRules` for validation
- [ ] `GET /sports/:sportId/events/:eventId/candidates` returns sorted candidates with correct `sortKeys`

Optional, separate track:

- [ ] `PropBetModule` in `packages/sport-<id>/` + register in `server/src/sports/propBetRegistry.ts`
- [ ] `SportEmailContent` in `server/src/sports/<id>/emailContent.ts` + register in `server/src/sports/emailContentRegistry.ts`

---

## Phase 7 — Dry run

- [ ] Add `server/src/scripts/<sport>DryRun.ts` + `script:<sport>-dry-run` in `server/package.json`
- [ ] `pnpm --filter server run service:init-event <sportId> <dry-run-externalId>`
- [ ] Confirm `CompetitionEvent.isActive = true` and field sync populated the candidate pool
- [ ] Create test lineups (full roster + `winningLineupTotal` prediction)
- [ ] Create a test contest; run `runSportEventPipeline` or enable cron
- [ ] Confirm scores sync, contest lineups rank correctly, tie-break resolves ties
- [ ] Confirm `batchActivateContests` at `LIVE` and `batchSettleContests` at `COMPLETE` (on-chain settle needs a real contract; off-chain ranking path is sufficient for plugin verification)

---

## Phase 8 — Contest commentary (optional for v1)

Ship when the sport should show Cutbot **Live Analysis** (and optionally rolling **Contest Updates**). Client Cutbot UI is sport-agnostic — no client plugin work unless the sport needs custom copy surfaces.

**Shared storage / infra (already on platform):**

| Asset | Role |
|-------|------|
| `Contest.commentary` + `commentaryGeneratedAt` | Overview snapshot (Live Analysis modal) |
| `Contest.commentaryFeed` JSON | Rolling story feed document |
| `CommentaryFeedJob` | Async LLM queue for feed items |
| GetStream `contest:{contestId}` | Optional dual-write delivery ([stream-feeds.md](../../docs/platform/stream-feeds.md)) |
| `CONTEST_COMMENTARY_ENABLED` + `CURSOR_API_KEY` | Env gates |
| Shared LLM mutex | Overview vs feed worker single-flight |

**Decide cadence for this sport:**

| Cadence | When to use | Reference |
|---------|-------------|-----------|
| Continuous (~20 min) | Live play with frequent score ticks | PGA overview pipeline |
| Period / day settle | Multi-day legs with clear session closes | Commodities daily overview |
| Event-end only | Short single-session sports | — |

Checklist:

- [ ] Lock cadence and v1 surface: **overview only** vs overview + feed stories
- [ ] Package: pure analyzer + prompt builder (reuse `@cut/sport-sdk` `contestCommentaryVoices`)
- [ ] Package tests for context shape and settle/fingerprint helpers
- [ ] Server context builder loads contest lineups + field scores; dispatches from `generateContestCommentary`
- [ ] Wire refresh: overview cron and/or `afterLiveScoreSync` (feed classify should not call Cursor inline)
- [ ] Idempotency: skip when the same period/fingerprint was already written
- [ ] Manual script: `pnpm --filter server run script:contest-commentary <contestId>` works for this sport
- [ ] Authoritative doc: `packages/sport-<id>/CONTEST_COMMENTARY.md` (data contract + cadence)
- [ ] Activation runbook: env vars, when commentary runs, how to force a snapshot

**Daily / period summary data contract** (overview context should include):

- Contest race: scores, positions, paid-cut gap, entry display names
- Period progress: which leg/day just settled vs still provisional
- Owned-field movers for that period (points / % / ownership)
- Consensus / shared picks when ownership is locked
- Uncertainty notes (remaining periods, missing prices / DNP)

**Feed Phase 2** (document in the sport commentary doc; defer code until needed): story classifier, period fingerprints, `CommentaryFeedJob` enqueue, Stream publish. Golf reference: [`packages/sport-pga-golf/CONTEST_COMMENTARY.md`](../../packages/sport-pga-golf/CONTEST_COMMENTARY.md). Commodities reference: [`packages/sport-commodities/CONTEST_COMMENTARY.md`](../../packages/sport-commodities/CONTEST_COMMENTARY.md).

---

## Phase 9 — Ops runbook

- [ ] Create `docs/sports/<id>/event-activation-runbook.md` (mirror golf/F1/commodities structure)
- [ ] Quick reference table: `sportId`, `externalId` pattern, lookup command, init command, spike, dry-run
- [ ] Prerequisites: env vars, seed, `DATABASE_URL` safety check
- [ ] Activation steps: resolve `externalId` → init → verify field → race-day cron behavior
- [ ] Commentary section when Phase 8 shipped (env + cadence + manual script)
- [ ] Troubleshooting table
- [ ] Run log section for operator notes
- [ ] Cross-link from `docs/sports/golf/event-activation-runbook.md` (golf hub) if this is a second+ sport

---

## Phase 10 — Ship verification

Run before marking the sport done:

```bash
pnpm --filter @cut/sport-<id> test
pnpm --filter @cut/sport-<id> run build
pnpm --filter server test:run
pnpm --filter server run script:<sport>-data-spike <dry-run-externalId>
pnpm --filter server run service:init-event <sportId> <dry-run-externalId>
pnpm --filter server run script:<sport>-dry-run <dry-run-externalId>
pnpm --filter client run build
```

If Phase 8 shipped: `pnpm --filter server run script:contest-commentary <testContestId> --context`

---

## Drop a sport

Reverse of add — no platform schema or contest/wallet changes required:

1. Set `Sport.isEnabled = false` (or remove seed row)
2. Unregister from server registries (`registry.ts`, `propBetRegistry.ts`, `emailContentRegistry.ts`, `eventStatusRegistry.ts`) and `client/src/sports/registry.ts`
3. Delete `packages/sport-<id>/`, `server/src/sports/<id>/`, `client/src/sports/<id>/`, and sport-specific scripts/docs
4. Run `pnpm run check:sport-boundary`

---

## Standard platform conventions

| Concern | Convention |
|---------|------------|
| **Tie-break JSON** | `{ type: "winningLineupTotal", value: number }` — `@cut/sport-sdk` |
| **Prediction range** | `Sport.predictionRules` in seed (`min`, `max`, `defaultRandomMin`, `defaultRandomMax`) |
| **Event init** | `pnpm --filter server run service:init-event <sportId> <externalId>` |
| **Active event** | One `isActive` event per sport; init deactivates the previous one |
| **Cron (scores)** | `runSportEventPipeline` every 5 min — metadata → field → live scores → contest lineups → optional `afterLiveScoreSync` |
| **Cron (commentary)** | `overviewPipeline` every 20 min — sport-specific overview refresh (PGA continuous; commodities day-settle); optional feed worker for story jobs |
| **Metadata** | Sport-specific block on `CompetitionEvent.metadata` (e.g. `metadata.f1`, `metadata.commodities`, golf block) |
| **Shared LLM mutex** | `server/src/lib/commentaryLlmMutex.ts` (platform; not under a sport folder) |
| **Import boundary** | No `@cut/sport-*` (except sdk) in `services/`, `lib/`, `utils/`, `routes/`, `cron/` — `pnpm run check:sport-boundary` |
---

## Typical file layout

```
packages/sport-<id>/
  src/create-module.ts
  src/status.ts
  src/metadata.ts
  src/candidates.ts
  src/candidateSort.ts
  src/validation.ts
  src/ranking.ts
  src/live-scores.ts
  src/contestCommentary.ts          # optional Phase 8
  src/contestCommentaryPrompt.ts    # optional Phase 8
  src/index.ts
  src/*.test.ts
  CONTEST_COMMENTARY.md             # optional Phase 8

server/src/sports/<id>/
  handlers.ts
  initEvent.ts
  syncMetadata.ts
  syncField.ts
  syncLiveScores.ts
  metadataMerge.ts
  <apiClient>.ts
  externalId.ts
  commentary/                       # optional Phase 8
    refresh*Overviews.ts

client/src/sports/<id>/
  index.tsx
  CandidateRow.tsx
  ParticipantRow.tsx
  ParticipantDetail.tsx
  PredictionField.tsx
  EventSummary.tsx                  # hub/hero UI — not Cutbot copy

docs/sports/<id>/
  competition-brief.md
  data-sources.md
  event-activation-runbook.md

server/src/scripts/
  <sport>DataSpike.ts
  <sport>DryRun.ts
  [<sport>ListEvents.ts]   # if externalId lookup is non-obvious
```
