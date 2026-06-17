# Server services

Business logic under `server/src/services/`, grouped by domain. Cron and routes call these — not the reverse.

---

## Events & sports

| Service | Purpose |
|---------|---------|
| `events/getActiveEvents.ts` | All `isActive` events (cron) |
| `events/getActiveEvent.ts` | Active event for one sport (API) |
| `events/getEventCandidates.ts` | Candidate pool via sport plugin |
| `sports/listEnabledSports.ts` | `GET /sports` |
| `initEvent.ts` | CLI: `service:init-event` |

Golf sync handlers: `server/src/sports/pga-golf/` (`initEvent`, `syncMetadata`, `syncField`, `syncLiveScores`)

---

## Lineups

| Service | Purpose |
|---------|---------|
| `lineups/getLineupsForEvent.ts` | List user lineups for an event |
| `lineups/createLineupForEvent.ts` | Create lineup; duplicate check |
| `lineups/updateLineupById.ts` | Update lineup by id |
| `lineups/formatLineup.ts` | API response shape |

---

## Contests

| Service | Purpose |
|---------|---------|
| `contest/settleContest.ts` | Rank + on-chain settlement |
| `updateContestLineups.ts` | Live scores/positions for an event |
| `batch/batchActivateContests.ts` | OPEN → ACTIVE |
| `batch/batchSettleContests.ts` | ACTIVE/LOCKED → SETTLED |
| `batch/batchCloseContests.ts` | Post-settlement cleanup |
| `batch/batchLockContests.ts` | Admin lock eligible |

Utilities: `utils/formatContestResponse.ts`, `utils/contestTimeline.ts`, `utils/lineupValidation.ts`

---

## Cron

| Service | Purpose |
|---------|---------|
| `cron/runSportEventPipeline.ts` | Per-event plugin sync + lineup score updates |

Orchestrated by `cron/scheduler.ts`.

---

## Side bets (platform)

| Service | Purpose |
|---------|---------|
| `propBets/ingestPropBetQuoteForLineup.ts` | Registry → module → persist |
| `propBets/persistMarketSnapshot.ts` | Write `SideBetMarket` / selections |
| `sideBets/refreshOpenSideBetQuotes.ts` | Cron batch quote refresh |
| `sideBets/markSideBetMarketStaleAfterRosterChange.ts` | After lineup save |
| `sideBets/lineupSideBetUtils.ts` | Placement names, sorted IDs |
| `sideBets/fetchSideBetDataGolfSnapshot.ts` | Shared DataGolf fetch for batch |
| `betting/settleSideBetTicket.ts` | Grade via `PropBetModule` |
| `batch/batchLockSideBetMarkets.ts` | Admin |
| `batch/batchSettleSideBets.ts` | Admin |
| `batch/batchCloseSideBetMarkets.ts` | Admin |

Golf quote logic: `sports/pga-golf/buildGolfMarketSnapshot.ts`

---

## Admin

| Service | Purpose |
|---------|---------|
| `admin/getAdminDashboard.ts` | Dashboard aggregates |
| `admin/adminEventContext.ts` | Resolve active event; `eventId` / `tournamentId` alias |

---

## Auth & referrals

| Service | Purpose |
|---------|---------|
| `lib/privyUserProvisioning.ts` | User + wallet from Privy |
| `batch/batchSyncReferralGraph.ts` | On-chain referral graph sync |

Middleware: `middleware/auth.ts`

---

## Email

| Path | Purpose |
|------|---------|
| `lib/email/` | Templates, blasts, dedupe via `EmailSendLog.eventId` |
| `lib/email/data/event.ts` | Load active event for email content |

Scripts: `scripts/sendBlastEmail.ts`, `scripts/emailPreview.ts`

---

## On-chain

| Service | Purpose |
|---------|---------|
| `services/shared/contractClient.ts` | Viem public client |
| Contest join/leave flows | Invoked from `routes/contest.ts` + client wagmi |

Contract ABIs: `server/src/contracts/`

---

## Odds (golf side bets)

| Path | Purpose |
|------|---------|
| `services/odds/calculateRoundRobinOdds.ts` | 4-player parlay matrix |
| `services/odds/dataGolf*.ts` | DataGolf API clients |

Used by golf `PropBetModule` ingest path only.

---

## Excluded / legacy (not in v4 build)

Legacy tournament-era services and routes are removed from the v4 tree. Cron and event lifecycle use `CompetitionEvent`, sport plugins, and `server/src/cron/scheduler.ts`. See [`cron.md`](cron.md).
