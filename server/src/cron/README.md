# Cron system

Scheduled background work for Play The Cut. The scheduler lives in `scheduler.ts` and uses the shared Prisma client from `../lib/prisma.js`.

**Canonical spec:** [`spec/server/cron.md`](../../../spec/server/cron.md)

---

## Enable / disable

| Variable                     | Value                  | Effect                                                                    |
| ---------------------------- | ---------------------- | ------------------------------------------------------------------------- |
| `ENABLE_CRON`                | `true`                 | Scheduler runs                                                            |
| `ENABLE_CRON`                | unset or anything else | Scheduler off                                                             |
| `CONTEST_COMMENTARY_ENABLED` | `true`                 | Enables live PGA commentary refreshes when `CURSOR_API_KEY` is configured |

### Entry points

| Process    | File              | Notes                                             |
| ---------- | ----------------- | ------------------------------------------------- |
| API server | `src/index.ts`    | Cron embedded when `ENABLE_CRON=true`             |
| Cron-only  | `src/cron-app.ts` | No HTTP; for a dedicated host (e.g. Raspberry Pi) |

Production Swarm runs cron **off** on web replicas (`ENABLE_CRON=false` in `swarm/stack.yml`). Run `cron-app` on a separate host with [`swarm/env/cron.env.example`](../../../swarm/env/cron.env.example).

Graceful shutdown: SIGTERM / SIGINT stop all scheduled tasks.

---

## Schedule

One job: **`mainPipeline`** at **`*/5 * * * *`** (every 5 minutes).

A `pipelineRunning` flag skips a tick if the previous run is still in progress.

---

## Pipeline sequence

1. **`getActiveEvents`** — all `CompetitionEvent` rows with `isActive=true`
2. **`runSportEventPipeline`** — once per active event (sport plugin):
   - `syncEventMetadata`
   - `syncParticipantField`
   - `handleWithdrawals` (if the plugin implements it)
   - When `shouldSyncLiveScores` (golf: round In Progress / Complete / playoff):
     - `syncLiveScores`
     - `updateContestLineupsForEvent`
3. **`refreshOpenSideBetQuotes`** — no-op unless `SIDE_BETS_ENABLED` and `DATAGOLF_API_KEY`
4. **`batchActivateContests`** — `OPEN` → `ACTIVE` when the sport says the event is live
5. **`batchGenerateContestCommentary`** — refresh the latest analysis for entered, live PGA contests when missing or at least 20 minutes old
6. **`batchSettleContests`** — `ACTIVE` / `LOCKED` → `SETTLED` when the event is complete
7. **`batchCloseContests`** — `SETTLED` → `CLOSED` after on-chain expiry
8. **`batchSyncReferralGraph`** — push pending referral registrations on-chain

Commentary is stored as the latest snapshot on `Contest` and returned with the
contest lobby payload. A failed generation leaves the previous snapshot intact.

**Not in cron:** `batchLockContests` (`ACTIVE` → `LOCKED`) — admin API or CLI only. Side-bet lock / settle / close — admin only.

---

## Error handling

- Each step is wrapped in `executeWithErrorHandling`; one failure does not stop later steps.
- DB connection errors (`P2037`) wait 30 seconds before the wrapper returns.
- Logs use the `[CRON]` prefix.

---

## API

`GET /api/cron/status` — whether cron is enabled and the pipeline steps (see `src/routes/cron.ts`).

---

## Manual / CLI

| Task                              | Command                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| Init event                        | `pnpm run service:init-event pga-golf R2026033`                                                    |
| Sync metadata                     | `pnpm run service:sync-event-metadata`                                                             |
| Sync field                        | `pnpm run service:sync-event-field`                                                                |
| Sync scores                       | `pnpm run service:sync-event-scores`                                                               |
| Update lineups                    | `pnpm run service:update-contest-lineups`                                                          |
| Activate / settle / close (batch) | `service:batch-activate-contests`, `service:batch-settle-contests`, `service:batch-close-contests` |
| Lock contests                     | `service:batch-lock-contests` or `POST /api/admin/contests/lock-eligible`                          |
| Referral sync                     | `service:batch-sync-referral-graph`                                                                |

Operator runbooks: [`docs/sports/golf/event-activation-runbook.md`](../../../docs/sports/golf/event-activation-runbook.md) (golf) · [`docs/sports/f1/event-activation-runbook.md`](../../../docs/sports/f1/event-activation-runbook.md) (F1).
