# Platform Rewrite Implementation

Greenfield rewrite of Play The Cut to match [PLATFORM_ARCHITECTURE.md](PLATFORM_ARCHITECTURE.md). PGA Golf is the first sport plugin. Old production stays live until data migration and cutover (Option C — no dual APIs in one deployment).

**Working branch:** `v4`

**North star:** [PLATFORM_ARCHITECTURE.md](PLATFORM_ARCHITECTURE.md)

**Strategy:** New schema, APIs, and plugin architecture on this branch. Production unchanged until Phase 10 cutover.

### Phase status

| Phase | Scope | Status |
|---|---|---|
| 1–2 | sport-sdk + platform schema | ✅ Done |
| 3–4 | Server registry, sports APIs, PGA golf plugin | ✅ Done |
| 5 | Contests, settlement, cron | ✅ Done |
| 6–7 | Client shell, routing, golf UI plugin | ✅ Done |
| 8 | Account, leagues, side bets, email, admin | ✅ Done |
| 9 | Prod DB migration script | ✅ Done |
| 10 | Cleanup + cutover | Code cleanup done; staging + prod cutover remain |
| 11 | NFL / future sports | Post-v1 |

**Live APIs:** `/sports`, `/lineups`, `/contests`, `/bets`, `/admin`, `/userGroups`  
**Legacy removed:** `/tournaments`, `/lineup` (501 stubs deleted); old tournament services and client bridges removed

---

## Completed Tasks

- [x] Local dev database: `playthecut-local` container, `playthecut` database, fresh volume
- [x] `DATABASE_URL` updated in `server/.env` and `server/.env.example`
- [x] Docker compose renamed (`betthecut-db-porto` → `playthecut-local`)
- [x] Master task list created (`PLATFORM_REWRITE.md`)
- [x] `project-overview.mdc` references target architecture
- [x] Phase 1: `packages/sport-sdk` with `SportModule`, `SportUIPlugin`, `PropBetModule` interfaces
- [x] Phase 1: Shared types (`RosterRules`, `Candidate`, `ValidationResult`, `RankedEntry`, `PayoutVector`, etc.)
- [x] Phase 1: `@cut/sport-sdk` wired into server and client
- [x] Phase 1: Stub `packages/sport-pga-golf` implementing `SportModule`
- [x] Phase 1: `pnpm run server:build` and `pnpm run client:build` succeed
- [x] Phase 2: Greenfield Prisma schema (`Sport`, `CompetitionEvent`, `Participant`, `EventParticipant`, `Lineup`, `LineupPick`)
- [x] Phase 2: `Contest.eventId`, `ContestLineup.lineupId`, side bet and email FK renames
- [x] Phase 2: Baseline migration `20260611153145_init_platform_schema` on `playthecut`
- [x] Phase 2: Seed `pga-golf` sport row
- [x] Phase 2: Removed `Tournament`, `Player`, `TournamentPlayer`, `TournamentLineup` models

---

- [x] Phase 3: `server/src/sports/registry.ts` with `requireSportModule()`
- [x] Phase 3: `GET /api/sports`, active event, candidates, lineup routes
- [x] Phase 3: Legacy `/api/tournaments` and `/lineup` return 501 (other routes ported in later phases)
- [x] Phase 3: Server compiles and sports API smoke-tested

---

- [x] Phase 4: `createPgaGolfModule` with server handlers wired to PGA libs
- [x] Phase 4: `initEvent`, `syncEventMetadata`, `syncParticipantField`, `syncLiveScores`
- [x] Phase 4: Golf ranking, validation, candidates, event status in `@cut/sport-pga-golf`
- [x] Phase 4: CLI `pnpm run service:init-event pga-golf R2026033` (+ sync scripts)
- [x] Phase 5: Contest lifecycle services ported to `eventId` / `lineup` schema
- [x] Phase 5: Settlement delegates ranking and payouts to sport plugin
- [x] Phase 5: Multi-sport cron pipeline (`runSportEventPipeline`, rewritten `scheduler.ts`)
- [x] Phase 5: Cron re-enabled when `ENABLE_CRON=true` (main server + `cron-app`)
- [x] Phase 5: Contest schemas use `eventId`; `prismaIncludes` updated for lineup picks

---

- [x] Phase 5: Port `server/src/routes/contest.ts` — `eventId`, `lineupId`, `lineup.picks` response shape
- [x] Phase 5: Remount `/api/contests` (list, detail, create, join/leave, timeline, secondary participants)

---

- [x] Phase 6: `/sports/:sportId` hub + contest redirect; `/leagues/*` canonical; `/user-groups/*` redirects
- [x] Phase 6: `SportContext`, client sport registry, sport picker in TopNav
- [x] Phase 6: `useActiveTournament` bridges to `/api/sports` + candidates (legacy tournament shape)
- [x] Phase 6: Contest/lineup hooks use `eventId` and `/api/lineups/:eventId`
- [x] Phase 6: Platform shell — `SportEventHeader`, `CandidatePicker`, `SportPredictionField`, `useSportUI`
- [x] Phase 6: `LineupSlotPicker` wires `CandidatePicker` into lineup slot editor
- [x] Phase 7: `client/src/sports/pga-golf/` `SportUIPlugin` (`CandidateRow`, `ParticipantRow`, `PredictionField`, `EventSummary`, `EventDetails`)
- [x] Phase 7: Golf UI in hub, lineup editor, slot picker, and editable pick rows (`SportLineupPickRow`)
- [x] Phase 8 (partial): Side bets API remounted at `/api/bets` (`lineupId`, `eventParticipantIds`)
- [x] Phase 8 (partial): Side bet services + batch lock/settle/close ported to platform schema
- [x] Phase 8: Side bets refactored to `PropBetModule` (golf quote ingest + grading)
- [x] Phase 8: Multi-lineup per event restored (`GET` list, `POST` create, `PUT` update by `lineupId`)
- [x] Spec docs rewritten under `spec/` (platform, server, client, cross-layer)
- [x] Phase 8 (partial): `SportEventContextBar` replaces legacy `TournamentContextBar`
- [x] Phase 8 (partial): Admin API remounted at `/api/admin` (`tournamentId` alias for `eventId`)
- [x] Phase 8 (partial): Account/wallet/referral — already on `/api/auth` + Privy provisioning (verified)
- [x] Phase 8 (partial): `GET /api/userGroups/:id/contests` — league contests across events
- [x] Phase 8 (partial): League UI grouped contest list + sport picker in create-contest forms
- [x] Phase 8 (partial): Side-bet quote refresh wired in cron (`refreshOpenSideBetQuotes`)
- [x] Phase 8 (partial): `docs/event-activation-runbook.md`
- [x] Phase 8 (partial): Email templates + `EmailSendLog` ported to `eventId` / `CompetitionEvent`
- [x] Phase 8: Side bets refactored to `PropBetModule` (golf quote ingest + grading)
- [x] Phase 9: Prod DB snapshot migration validated (`--apply` + `--validate` passed)

---

## In Progress Tasks

### Phase 10 — Architecture cleanup + cutover

- [x] Client type foundation (`PlatformLineup`, `useActiveEvent`, platform lineup hooks)
- [x] Migrate pages off `useActiveTournament` bridge (pages + contest lobby)
- [x] `ParticipantRow` plugin slot — leaderboard, contest entries, lineup card, live picker delegate
- [x] Full golf live score sync (`transformGolfParticipantScores` in `@cut/sport-pga-golf`)
- [x] Client sport UI boundaries documented — `spec/client/sport-ui-plugins.md`
- [x] Track A client cleanup — delete orphaned lineup UI, tournament preview on `useActiveEvent`, `LineupManagement` plugin rows, remove `PlayerDisplayRow`
- [x] `ParticipantDetail` plugin slot — scorecard modal; replaces `PlayerDetailModal` / `PlayerDisplayCard` / `candidateToPlayer` in detail flow
- [x] Client plugin boundary cleanup — scorecard primitives in `sports/pga-golf/scorecard/`; removed `components/player/`, `components/tournament/`, `types/player.ts`, `types/tournament.ts`
- [x] Lineup display scores from API (`PlatformLineup.score`, `lineupDisplayScore`) — no client golf aggregation in platform components
- [ ] Staging dry-run with migrated data
- [ ] Production cutover (see `docs/platform-cutover-plan.md`)

---

## Future Tasks

### Phase 10 — Remaining cutover

- [ ] Production cutover (maintenance window)
- [x] Remove legacy routes, services, and client pages
- [x] Update `spec/` docs to match new architecture

### Phase 11 — NFL and future sports (post-v1)

- [ ] `Sport` seed row for `nfl-fantasy`
- [ ] `packages/sport-nfl-fantasy` server plugin
- [ ] Client `SportUIPlugin` and schedule ingestion

---

## Implementation Plan

### What we keep vs rebuild

| Keep (port or wire in) | Rebuild |
|---|---|
| Smart contracts (`ContestController`, `ContestFactory`, `ReferralGraph`) | Prisma schema: generic sport/event/lineup models |
| `@cut/secondary-pricing` | `packages/sport-sdk` + `packages/sport-pga-golf` |
| Privy auth, `User`, `UserWallet`, referral fields | Sport-scoped APIs (`/sports/*`) |
| `UserGroup` / `UserGroupMember` | Multi-sport cron dispatch |
| Contest lifecycle services | Generic lineup shell + `SportUIPlugin` |
| On-chain payment indexing | Client routing (`/sports/:sportId`, `/leagues/:id`) |
| Golf ingestion logic (extract into plugin) | Side bets → `PropBetModule` |

### Local development database

| Setting | Value |
|---|---|
| Container | `playthecut-local` |
| Database | `playthecut` |
| User / password | `playthecut` / `playthecut` |
| `DATABASE_URL` | `postgresql://playthecut:playthecut@localhost:5432/playthecut` |

```bash
pnpm run db:start    # start Postgres
pnpm run db:stop     # stop Postgres
pnpm run db:logs     # tail logs
```

Legacy local data (if needed for migration testing) remains in the old `postgres_data` Docker volume.

### Suggested commit cadence

| Commits | Phase |
|---|---|
| 1–2 | Phase 0–1: tracker + sport-sdk |
| 2–3 | Phase 2: schema + seed |
| 2–3 | Phase 3: registry + event APIs |
| 5–8 | Phase 4: golf plugin |
| 3–5 | Phase 5: contest FK rename, settlement, cron |
| 5–8 | Phase 6–7: client routing, shell, golf UI |
| 4–6 | Phase 8: leagues, side bets, email, admin |
| 2–3 | Phase 9: migration script |
| 1–2 | Phase 10: cutover |

**Estimated timeline:** 3–6 weeks.

### Risk register

| Risk | Mitigation |
|---|---|
| On-chain `entryId` mismatch after migration | Preserve IDs explicitly; validate before cutover |
| Golf plugin scoring regressions | Side-by-side score comparison on migrated data |
| Branch diverges from prod bugfixes | Cherry-pick critical prod fixes only |
| Cutover during active tournament | Schedule between events; document rollback |
| JSON metadata query performance | Index `sportId`, `externalId`, `isActive` |

---

## Relevant Files

| File | Purpose | Status |
|---|---|---|
| [PLATFORM_ARCHITECTURE.md](PLATFORM_ARCHITECTURE.md) | Target architecture spec | ✅ |
| [PLATFORM_REWRITE.md](PLATFORM_REWRITE.md) | This task tracker | ✅ |
| [docker/docker-compose.yml](docker/docker-compose.yml) | Local Postgres (`playthecut-local`) | ✅ |
| [server/.env.example](server/.env.example) | Local `DATABASE_URL` default | ✅ |
| [packages/sport-sdk/](packages/sport-sdk/) | Shared plugin interfaces | ✅ |
| [packages/sport-pga-golf/](packages/sport-pga-golf/) | Golf plugin (ranking, validation, module factory) | ✅ |
| [server/src/sports/pga-golf/](server/src/sports/pga-golf/) | Golf handlers (init, sync, live scores) | ✅ |
| [server/src/services/initEvent.ts](server/src/services/initEvent.ts) | Event init CLI | ✅ |
| [server/src/sports/registry.ts](server/src/sports/registry.ts) | Server plugin registry | ✅ |
| [server/src/routes/sports.ts](server/src/routes/sports.ts) | Sports and event APIs | ✅ |
| [server/src/routes/lineups.ts](server/src/routes/lineups.ts) | Lineup list/create/update APIs | ✅ |
| [server/src/routes/api.ts](server/src/routes/api.ts) | Platform API router (no legacy mounts) | ✅ |
| [client/src/sports/types.ts](client/src/sports/types.ts) | Client sport-sdk type re-exports | ✅ |
| [server/prisma/schema.prisma](server/prisma/schema.prisma) | Platform database schema | ✅ |
| [server/prisma/migrations/20260611153145_init_platform_schema/](server/prisma/migrations/20260611153145_init_platform_schema/) | Baseline migration | ✅ |
| [server/prisma/seed.ts](server/prisma/seed.ts) | Seeds `pga-golf` sport | ✅ |
| [server/src/services/events/getActiveEvents.ts](server/src/services/events/getActiveEvents.ts) | Active events for cron dispatch | ✅ |
| [server/src/services/cron/runSportEventPipeline.ts](server/src/services/cron/runSportEventPipeline.ts) | Per-event plugin sync + lineup scores | ✅ |
| [server/src/services/updateContestLineups.ts](server/src/services/updateContestLineups.ts) | Contest scores/positions via sport plugin | ✅ |
| [server/src/services/contest/settleContest.ts](server/src/services/contest/settleContest.ts) | Settlement via plugin ranking/payouts | ✅ |
| [server/src/cron/scheduler.ts](server/src/cron/scheduler.ts) | Multi-sport cron pipeline | ✅ |
| [server/src/routes/contest.ts](server/src/routes/contest.ts) | Contest HTTP API (`eventId`, `lineupId`) | ✅ |
| [server/src/utils/formatContestResponse.ts](server/src/utils/formatContestResponse.ts) | Contest list/detail formatting | ✅ |
| [server/src/utils/lineupValidation.ts](server/src/utils/lineupValidation.ts) | Duplicate checks on event lineups | ✅ |
| [server/src/utils/contestTimeline.ts](server/src/utils/contestTimeline.ts) | Timeline data (lineup-based) | ✅ |
| [client/src/contexts/SportContext.tsx](client/src/contexts/SportContext.tsx) | Sport id from URL | ✅ |
| [client/src/sports/registry.ts](client/src/sports/registry.ts) | Client UI plugin registry | ✅ |
| [client/src/hooks/useSportData.ts](client/src/hooks/useSportData.ts) | Sports list + active event queries | ✅ |
| [client/src/lib/lineupScore.ts](client/src/lib/lineupScore.ts) | Display lineup score from API | ✅ |
| [client/src/pages/SportHubPage.tsx](client/src/pages/SportHubPage.tsx) | Sport-scoped contest list + event header | ✅ |
| [client/src/App.tsx](client/src/App.tsx) | `/sports/:sportId`, `/leagues/*` routing | ✅ |
| [client/src/sports/pga-golf/](client/src/sports/pga-golf/) | Golf `SportUIPlugin` + scorecard/, types, eventMedia | ✅ |
| [client/src/components/platform/SportEventContextBar.tsx](client/src/components/platform/SportEventContextBar.tsx) | AppLayout event hero (route-gated) → `SportEventHeader` → plugin | ✅ |
| [client/src/components/platform/](client/src/components/platform/) | Platform shell: event header, picker, prediction, lineup rows | ✅ |
| [client/src/sports/pga-golf/EventDetails.tsx](client/src/sports/pga-golf/EventDetails.tsx) | Golf event hero text (replaces `TournamentContextDetails`) | ✅ |
| [client/src/components/platform/LineupSlotPicker.tsx](client/src/components/platform/LineupSlotPicker.tsx) | Bridges participant IDs ↔ `CandidatePicker` | ✅ |
| [client/src/components/platform/SportParticipantRow.tsx](client/src/components/platform/SportParticipantRow.tsx) | Platform shell → plugin `ParticipantRow` | ✅ |
| [client/src/components/platform/SportParticipantDetailModal.tsx](client/src/components/platform/SportParticipantDetailModal.tsx) | Platform shell → plugin `ParticipantDetail` | ✅ |
| [client/src/sports/pga-golf/ParticipantDetail.tsx](client/src/sports/pga-golf/ParticipantDetail.tsx) | Golf scorecard detail modal body | ✅ |
| [client/src/components/platform/SportLineupPickRow.tsx](client/src/components/platform/SportLineupPickRow.tsx) | Editable lineup slot wrapper | ✅ |
| [client/src/hooks/useSportUI.ts](client/src/hooks/useSportUI.ts) | Resolve UI plugin from sport context | ✅ |
| [server/src/routes/bets.ts](server/src/routes/bets.ts) | Side bets API (`lineupId`, `eventId`) | ✅ |
| [server/src/services/sideBets/](server/src/services/sideBets/) | Quote ingest + stale marking (platform schema) | ✅ |
| [server/src/routes/admin.ts](server/src/routes/admin.ts) | Admin HTTP API (dashboard, users, side-bet batch ops) | ✅ |
| [server/src/services/admin/](server/src/services/admin/) | Dashboard + event context + minimal test email | ✅ |
| [server/src/services/batch/batchLockSideBetMarkets.ts](server/src/services/batch/batchLockSideBetMarkets.ts) | Lock side-bet markets by `eventId` | ✅ |
| [server/src/services/batch/batchSettleSideBets.ts](server/src/services/batch/batchSettleSideBets.ts) | Settle side bets when event complete | ✅ |
| [server/src/services/batch/batchCloseSideBetMarkets.ts](server/src/services/batch/batchCloseSideBetMarkets.ts) | Close side-bet markets by `eventId` | ✅ |
| [server/src/cron/scheduler.ts](server/src/cron/scheduler.ts) | Cron pipeline incl. side-bet quote refresh | ✅ |
| [client/src/components/contest/CreateContestEventPicker.tsx](client/src/components/contest/CreateContestEventPicker.tsx) | Sport + active event picker for contest create | ✅ |
| [client/src/components/contest/GroupedContestList.tsx](client/src/components/contest/GroupedContestList.tsx) | League contests grouped by sport/event | ✅ |
| [docs/event-activation-runbook.md](docs/event-activation-runbook.md) | Platform event activation ops | ✅ |
| [server/src/lib/email/](server/src/lib/email/) | Email templates + blasts on `eventId` | ✅ |
| [server/src/sports/propBetRegistry.ts](server/src/sports/propBetRegistry.ts) | Prop bet plugin registry | ✅ |
| [packages/sport-pga-golf/src/prop-bet.ts](packages/sport-pga-golf/src/prop-bet.ts) | Golf prop grading + snapshot metadata types | ✅ |
| [server/src/services/propBets/](server/src/services/propBets/) | Platform ingest persistence + orchestration | ✅ |
| [server/src/scripts/migrate-from-legacy.ts](server/src/scripts/migrate-from-legacy.ts) | Prod data migration (`LEGACY_DATABASE_URL` → `DATABASE_URL`) | ✅ validated |
| [client/src/hooks/useActiveEvent.ts](client/src/hooks/useActiveEvent.ts) | Primary active event hook (platform types) | ✅ |
| [client/src/lib/lineupUtils.ts](client/src/lib/lineupUtils.ts) | Platform lineup helpers + player bridge for UI | ✅ |
| [docs/platform-cutover-plan.md](docs/platform-cutover-plan.md) | Production cutover runbook (ops reference) | ✅ |
