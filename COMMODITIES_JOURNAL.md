# Commodities sport — implementation journal

Living record of progress, assumptions, and platform-fit learnings. Updated each work session.

**Related:** [competition brief](docs/sports/commodities/competition-brief.md) · [data sources](docs/sports/commodities/data-sources.md) · [add-sport checklist](spec/platform/add-sport-checklist.md)

---

## Locked product decisions (carry forward)

| Decision | Value |
|----------|-------|
| `sportId` / slug | `commodities` |
| Display name | Commodity Picks |
| Event unit | One US trading day (session open → close) |
| `externalId` | ISO date `YYYY-MM-DD` |
| Roster | 5 picks, flat pool, no duplicates |
| Scoring | Sum of % return per commodity; higher wins |
| Score scale | Golf-scale fixed-point: `+2.35%` → display **23.5**, stored `total=235` |
| Pool | 24 static catalog contracts (see brief) |
| Cadence | Daily — operator runs `init-event` each trading day |
| Data source (v1) | Yahoo Finance chart/quote API |
| Prediction rules | `min: -1000, max: 2500` (display -100.0…250.0), stored ×10 |

**Catalog swaps from original brainstorm:** Soybean Oil → Lumber (`LBS=F`); Soybean Meal → Lean Hogs (`HE=F`); both in **ag** sector.

---

## Assumptions to test

| # | Assumption | Status | Evidence |
|---|------------|--------|----------|
| 1 | Daily event + golf-scale fixed-point scores feel right in UI | partial | Dry-run scores 663/268/60; UI built — browser QA still useful |
| 2 | Yahoo futures symbols cover all 24 catalog rows | partial | Fixture OK all 24; live Yahoo needs slow per-symbol sync (2s delay + cache) |
| 3 | 5-min cron is enough drama for daily % moves | pending | Not exercised live; cron path verified via `runSportEventPipeline` |
| 4 | SportModule hooks need no platform schema changes | confirmed | No migration for commodities; applied pending `predictionRules` migration on DO DB |
| 5 | `eventMetadata.ts` branching scales to a third sport | confirmed | Commodities branch before F1/golf |
| 6 | Static catalog + daily init is acceptable ops for v1 | confirmed | `init-event` + runbook documented |
| 7 | Prediction tie-break works with fixed-point ×10 totals | confirmed | Dry-run: 3 lineups ranked; winner score 663 (display 66.3) |
| 8 | Fixture mode sufficient for CI/dry-run when Yahoo rate-limited | confirmed | `--fixture` + `COMMODITIES_USE_FIXTURE_PRICES=true` |

---

## Implementation inventory (as of 2026-06-29)

### Docs
- `docs/sports/commodities/competition-brief.md`
- `docs/sports/commodities/data-sources.md`
- `COMMODITIES_JOURNAL.md` (this file)
- `docs/sports/commodities/event-activation-runbook.md` — done

### Package `@cut/sport-commodities`
- `metadata.ts`, `status.ts`, `live-scores.ts`, `candidates.ts`, `commoditiesSortKeys.ts`, `candidateSort.ts`, `validation.ts`, `ranking.ts`, `create-module.ts`
- Tests: `live-scores.test.ts`, `status.test.ts` (9 passing)

### Server IO `server/src/sports/commodities/`
- `commodityCatalog.ts` — 24-row static catalog
- `externalId.ts` — `YYYY-MM-DD` validation
- `sessionConfig.ts` — ET session open/close via `date-fns-tz`
- `yahooFinanceClient.ts` — chart + per-symbol quotes, cache, fixture fallback
- `handlers.ts`, `initEvent.ts`, `syncMetadata.ts`, `syncField.ts`, `syncLiveScores.ts`, `metadataMerge.ts`
- Scripts: `commoditiesDataSpike.ts`, `commoditiesDryRun.ts`

### Client `client/src/sports/commodities/`
- Plugin: `index.tsx` registered in `client/src/sports/registry.ts`
- UI: `CandidateRow`, `CandidateSelectionCard`, `ParticipantRow`, `ParticipantDetail`, `PredictionField`, `EventSummary`, `EventDetails`
- `CommodityAvatar.tsx` + `icons.tsx` (24 icon keys, sector ring colors)
- Platform: `client/src/lib/eventMetadata.ts` commodities branch

### Seed
- `COMMODITIES_*` rules in `server/prisma/seed.ts`; `isEnabled: true` after ship verification

---

## Phase log

### Phase 0 — 2026-06-29

**Done:** Competition brief; journal with assumption table; locked scoring scale (tenths not basis points), daily cadence, 5 picks, catalog table.

**Went well:** F1 brief template mapped cleanly (session window vs race; % return vs finish points).

**Unexpected:** User refined catalog (lumber, lean hogs in ag) and scoring normalization to golf-scale integers.

**Platform judgement:** Checklist Phase 0 fits without platform changes.

**Next:** Phase 1 data spike.

---

### Phase 1 — 2026-06-29

**Done:** `data-sources.md`; `yahooFinanceClient.ts`; `commoditiesDataSpike.ts` + `script:commodities-data-spike`; env vars in `.env.example`.

**Went well:** Package `transformCommodityPrice` + spike share same math; fixture mode validates all 24 symbols offline.

**Unexpected:**
- Yahoo batch `/v7/finance/quote?symbols=CL=F,...` returned **401**
- Rapid requests returned **429**; single `query1` chart for `GC=F` returned **200** after 30s cooldown
- Mitigation: per-symbol quotes, 2s delay, 4min in-memory cache, `range=1mo&interval=1d` chart API, `COMMODITIES_USE_FIXTURE_PRICES` + spike `--fixture`

**Platform judgement:** External API pattern matches F1 (`openf1Client.ts`); no new platform abstractions needed.

**Next:** Phases 2–4 seed + package + server IO.

---

### Phase 2–4 — 2026-06-29

**Done:**
- Seed: 5 slots, prediction -1000…2500, sport row `commodities`
- Full `@cut/sport-commodities` package + tests
- Server registry, init/sync pipeline, static field sync

**Went well:** `createCommoditiesModule(handlers)` mirrors F1 exactly; `metadata.commodities` block parallels `metadata.f1`.

**Unexpected:** `syncLiveScores` marks `sessionComplete` when status is COMPLETE — same pattern as F1 `classificationComplete`.

**Platform judgement:** **Strong fit** — zero schema changes, cron pipeline unchanged.

**Next:** Client plugin + dry run.

---

### Phase 5–6 — 2026-06-29

**Done:** Full client UI plugin; sector-colored avatars; `eventMetadata.ts` third-sport branch.

**Went well:** `SportUIPlugin` contract sufficient — no platform layout forks.

**Unexpected:** Prediction slider uses display scale with `step={0.1}` but stores integer ×10 for `winningLineupTotal` validation.

**Platform judgement:** Branching in `eventMetadata.ts` is getting repetitive — consider sport plugin hook for status/start-date in sport #4+ (not blocking v1).

**Next:** Dry run, runbook, ship verification.

---

### Phase 7 — 2026-06-29

**Done:** `commoditiesDryRun.ts`; init + pipeline + 3 lineups + contest ranking on `2025-06-27` (fixture).

**Went well:** Winner score 663; 24/24 contracts scored; `COMPLETE` status for historical date.

**Unexpected:**
- `metadataMerge.ts` wrongly imported `./metadata.js` — fixed to `@cut/sport-commodities`
- Orphan lineups from failed partial run — cleanup now deletes `Dry Run —*` lineups on event
- On-chain settle fails on dummy address (expected, same as F1 dry-run)

**Platform judgement:** Off-chain ranking path sufficient for plugin verification.

**Next:** Runbook + ship checklist.

---

### Phase 8 — 2026-06-29

**Done:** `docs/sports/commodities/event-activation-runbook.md`; cross-link from golf hub.

**Went well:** Daily `YYYY-MM-DD` externalId is simpler than F1 session_key lookup.

**Unexpected:** —

**Platform judgement:** Ops burden is real (daily init) — documented; automated scheduler is v2.

---

### Phase 9 — 2026-06-29

**Done:** Ship verification:

```
pnpm --filter @cut/sport-commodities test     # 9 passed
pnpm --filter @cut/sport-commodities build    # OK
pnpm --filter server test:run                 # 81 passed
pnpm --filter server run script:commodities-data-spike -- --fixture 2025-06-27  # OK
pnpm --filter server run service:init-event commodities 2025-06-27            # OK (fixture)
pnpm --filter server run script:commodities-dry-run -- --fixture 2025-06-27   # PASSED
pnpm --filter server build                    # OK
pnpm --filter client build                    # OK
```

**Went well:** End-to-end plugin stack ships without platform schema changes for commodities.

**Unexpected:** Local DO database needed `prisma migrate deploy` for `predictionRules` column (pre-existing pending migrations, not commodities-specific).

**Platform judgement:** **Proceed** — commodities is a strong third plugin; Yahoo rate limits are the main production risk (mitigated by cache + per-symbol fetch).

**Next:** Browser QA at `/sports/commodities`; live Yahoo spike when rate limit cools; daily ops on trading days.

---

### Prod cleanup — 2026-06-29

**Context:** Dry-run and `init-event` ran against production `DATABASE_URL` by mistake.

**Removed from prod DB:**
- Contest `Commodities Dry Run — 2025-06-27` (+ 3 contest lineups, 3 timeline rows, 3 lineups)
- `CompetitionEvent` `2025-06-27` (+ 24 `EventParticipant` rows)
- Set `Sport` `commodities` → `isEnabled: false`

**Left in place (inert):**
- `Sport` row `commodities` with rules JSON (disabled)
- 24 `Participant` catalog rows for `sportId: commodities` (reused on next init; delete manually if zero footprint desired)

**Not reverted:** `db:seed` upserts for `pga-golf` / `f1` rules (idempotent updates only). Applied pending migrations (`predictionRules`, F1 externalId) — schema only, no data rollback needed.
