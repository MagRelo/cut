# Services

Platform services under `server/src/services/`. Cron orchestration: [`src/cron/README.md`](../src/cron/README.md) · [`spec/server/cron.md`](../../spec/server/cron.md).

---

## Manual (operator)

### `service:init-event {sportId} {externalId}`

Bootstraps a `CompetitionEvent` via the sport plugin (PGA golf: `pga-golf R2026033`).

- Upsert event row and metadata from external APIs
- Load `server/src/tournamentSummaries/{externalId}.json` into event metadata when present
- Sync participant field, profiles, rankings
- Set `isActive=true` on this event (clears other active events for the sport)

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
