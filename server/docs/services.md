# Services

Platform services under `server/src/services/`. Cron orchestration: [`src/cron/README.md`](../src/cron/README.md) · [`spec/server/cron.md`](../../spec/server/cron.md).

---

## Manual (operator)

### `service:init-event {sportId} {externalId}`

Bootstraps a `CompetitionEvent` via the sport plugin.

- **PGA golf:** `pnpm run service:init-event pga-golf R2026033` — see [event-activation-runbook.md](../../docs/sports/golf/event-activation-runbook.md)
- **F1:** `pnpm run service:init-event f1 9558` — see [event-activation-runbook.md](../../docs/sports/f1/event-activation-runbook.md)

Common behavior:

- Upsert event row and metadata from external APIs
- Sync participant field and profiles
- Set `isActive=true` on this event (clears other active events for the sport)

Golf-only: loads `server/src/tournamentSummaries/{externalId}.json` when present; DataGolf rankings.

### Admin / CLI contest ops

| Transition | Service |
|------------|---------|
| `OPEN` → `ACTIVE` | `activateContest` / `batchActivateContests` |
| `ACTIVE` → `LOCKED` | `lockContest` / `batchLockContests` (admin) |
| `ACTIVE` / `LOCKED` → `SETTLED` | `settleContest` / `batchSettleContests` |
| `SETTLED` → `CLOSED` | `closeContest` / `batchCloseContests` |

---

## Scheduled (`ENABLE_CRON=true`)

Every 5 minutes — single pipeline in `src/cron/scheduler.ts`:

1. Per active event: metadata, field, withdrawals, live scores (when live), contest lineup updates
2. Side-bet quote refresh (feature-flagged)
3. Batch activate / settle / close contests
4. Referral graph sync

See [`spec/server/cron.md`](../../spec/server/cron.md) for the full sequence.
