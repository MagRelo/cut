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
| `updateContestLineups.ts` | Live scores/positions for an event; platform popularity adjustment after lock ([consensus-axis.md](../../docs/platform/consensus-axis.md)) |
| `batch/batchActivateContests.ts` | OPEN → ACTIVE |
| `batch/batchSettleContests.ts` | ACTIVE/LOCKED → SETTLED |
| `batch/batchLockContests.ts` | Admin lock eligible |

Utilities: `utils/formatContestResponse.ts`, `utils/contestTimeline.ts`, `utils/lineupValidation.ts`

---

## Cron

| Service | Purpose |
|---------|---------|
| `cron/runSportEventPipeline.ts` | Per-event plugin sync + lineup score updates |

Orchestrated by `cron/scheduler.ts`.

---

## Admin

| Service | Purpose |
|---------|---------|
| `admin/getAdminDashboard.ts` | Dashboard aggregates (users, events, contests, leagues) |
| `admin/adminEventContext.ts` | Resolve active event; `eventId` / `tournamentId` alias |

---

## Auth & referrals

| Service | Purpose |
|---------|---------|
| `lib/privyUserProvisioning.ts` | User + wallet from Privy. Signup referral is best-effort (never blocks after JWT). |
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

## Excluded / legacy (not in v4 build)

Legacy tournament-era services and routes are removed from the v4 tree. Cron and event lifecycle use `CompetitionEvent`, sport plugins, and `server/src/cron/scheduler.ts`. See [`cron.md`](cron.md).
