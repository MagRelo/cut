# Cron system

Scheduled background work for Play The Cut. The scheduler lives in `scheduler.ts` and uses the shared Prisma client from `../lib/prisma.js`.

**Canonical spec:** [`spec/server/cron.md`](../../../spec/server/cron.md)

---

## Enable / disable

| Variable                     | Value                  | Effect                                                                    |
| ---------------------------- | ---------------------- | ------------------------------------------------------------------------- |
| `ENABLE_CRON`                | `true`                 | Scheduler runs                                                            |
| `ENABLE_CRON`                | unset or anything else | Scheduler off                                                             |
| `AUTO_INIT_EVENTS`           | `false`                | Skip Saturday/Monday event init; score pipeline still runs                |
| `CONTEST_COMMENTARY_ENABLED` | `true`                 | Enables PGA feed detect/enqueue + overview, commodities daily overview, and feed worker when `CURSOR_API_KEY` is configured |

### Entry points

| Process    | File              | Notes                                             |
| ---------- | ----------------- | ------------------------------------------------- |
| API server | `src/index.ts`    | Cron embedded when `ENABLE_CRON=true`             |
| Cron-only  | `src/cron-app.ts` | No HTTP; for a dedicated host (e.g. Raspberry Pi) |

Production Swarm runs cron **off** on web replicas (`ENABLE_CRON=false` in `swarm/stack.yml`). Run `cron-app` on a separate host with [`swarm/env/cron.env.example`](../../../swarm/env/cron.env.example).

Graceful shutdown: SIGTERM / SIGINT stop all scheduled tasks and request feed worker stop.

---

## Schedule

| Job | Cadence | Notes |
| --- | --- | --- |
| `scorePipeline` | `*/5 * * * *` | Promote prepared golf, scores, activate/settle, referral |
| `overviewPipeline` | `*/20 * * * *` | PGA continuous + commodities day-settle `Contest.commentary` refresh |
| `eventInitPipeline` | `0 10 * * *` America/New_York | Saturday commodities week; Monday next PGA event. `AUTO_INIT_EVENTS=false` skips |
| `feedWorker` | in-process | Drains `CommentaryFeedJob` (concurrency 1; PGA feed stories) |

Separate running flags skip a tick if that pipeline is still in progress.

---

## Score pipeline sequence

1. **`maybePromotePreparedGolfEvent`** — if active golf is COMPLETE, activate a later prepared golf event
2. **`getActiveEvents`** — all `CompetitionEvent` rows with `isActive=true`
3. **`runSportEventPipeline`** — once per active event (sport plugin):
   - `syncEventMetadata`
   - `syncParticipantField`
   - `handleWithdrawals` (if the plugin implements it)
   - When `shouldSyncLiveScores`:
     - `syncLiveScores`
     - `updateContestLineupsForEvent`
     - `afterLiveScoreSync` (golf: classify + enqueue feed jobs)
4. **`batchActivateContests`** — `OPEN` → `ACTIVE` when the sport says the event is live
5. **`batchSettleContests`** — `ACTIVE` / `LOCKED` → `SETTLED` when the event is complete
6. **`batchSyncReferralGraph`** — push pending referral registrations on-chain

Terminal on-chain states are `SETTLED` and `CANCELLED`. Permissionless `cancelExpired()` unlocks after `expiryTimestamp + SETTLEMENT_GRACE_PERIOD` (1 day) if the operator never settles.

Better Stack heartbeat reports on the **score** pipeline only.

**Not in cron:** `batchLockContests` (`ACTIVE` → `LOCKED`) — admin API or CLI only.

---

## Error handling

- Each step is wrapped in `executeWithErrorHandling`; one failure does not stop later steps.
- Logs use the `[CRON]` prefix.
- Upstream blips are tried once more in the same run. That covers Hyperliquid 502/503/504, a PGA field response that is truncated or the wrong shape, a thrown database connectivity error (`P1001`, `P1017`, `P2024`, `P2037`, pool timeout, socket timeout), and an `eth_call` whose block the RPC has not indexed yet. The retry is the read or the thrown task, not a batch that already returned per-contest failures.
- Anything still failing after that pages Better Stack on that run. Stuck cases page immediately: oracle mismatch, a missing referral or emergency-recovery address, a winner not on ReferralGraph, a contest whose chain state will not lock, an activate client bug, and a missing table.
- PGA scorecard and player-profile misses are logged as warnings and skipped. They do not fail the pipeline. Commentary failures stay on the overview worker and do not fail the score heartbeat.
- Dropped connections and timeouts (including commentary-client `ECONNRESET`) are logged and do not exit the process. The Better Stack ping itself retries once.

---

## API

`GET /api/cron/status` — whether cron is enabled and the pipeline steps (see `src/routes/cron.ts`). Staff only (`ADMIN` / `SUPER_ADMIN` after Privy auth).

---

## Manual / CLI

| Task                              | Command                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| Init event                        | `pnpm run service:init-event pga-golf R2026033`                                                    |
| Init next event                   | `pnpm run service:init-next-event [pga-golf\|commodities\|all] [--dry-run] [--skip-summary]`         |
| Sync metadata                     | `pnpm run service:sync-event-metadata`                                                             |
| Sync field                        | `pnpm run service:sync-event-field`                                                                |
| Sync scores                       | `pnpm run service:sync-event-scores`                                                               |
| Update lineups                    | `pnpm run service:update-contest-lineups`                                                          |
| Activate / settle (batch) | `service:batch-activate-contests`, `service:batch-settle-contests` |
| Lock contests                     | `POST /api/admin/contests/:contestId/lock`, `service:batch-lock-contests`, or `POST /api/admin/contests/lock-eligible` |
| Referral sync                     | `service:batch-sync-referral-graph`                                                                |

Operator runbooks: [`docs/sports/golf/event-activation-runbook.md`](../../../docs/sports/golf/event-activation-runbook.md) (golf) · [`docs/sports/f1/event-activation-runbook.md`](../../../docs/sports/f1/event-activation-runbook.md) (F1) · [`docs/sports/commodities/event-activation-runbook.md`](../../../docs/sports/commodities/event-activation-runbook.md) (commodities).
