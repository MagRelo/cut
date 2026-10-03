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
- Set `isActive=true` on this event (clears other active events for the sport). Golf auto-init uses `activate: false` when the current event is still LIVE or SCHEDULED.

Golf-only: DataGolf rankings. Tournament preview copy is written after auto-init when `CURSOR_API_KEY` is set (`summarySections`); operators can still run `script:write-tournament-summary` or the tournament-summary skill.

### `service:init-next-event [pga-golf|commodities|all] [--dry-run] [--skip-summary]`

Resolves the next commodities ISO week or PGA event with a published field, then runs the same init plugins as `service:init-event`. Cron uses this path on Saturday/Monday at 10:00 ET.

### Admin / CLI contest ops

| Transition | Service |
|------------|---------|
| `OPEN` → `ACTIVE` | `activateContest` / `batchActivateContests` |
| `ACTIVE` → `LOCKED` | `lockContest` / `batchLockContests` (admin); also auto-locked by `settleContest` when still ACTIVE |
| `LOCKED` → `SETTLED` | `settleContest` / `batchSettleContests` (locks first if contract is still ACTIVE) |
| Any non-SETTLED → `CANCELLED` | `cancelContest` (operator) or permissionless `cancelExpired` after expiry + grace period |

---

## Scheduled (`ENABLE_CRON=true`)

Every 5 minutes — single pipeline in `src/cron/scheduler.ts`:

1. Promote a prepared golf event if the active golf event is COMPLETE
2. Per active event: metadata, field, withdrawals, live scores (when live), contest lineup updates
3. Batch activate / settle contests
4. Referral graph sync

Daily 10:00 America/New_York — `eventInitPipeline`: Saturday commodities week, Monday PGA event (field + LIVE/SCHEDULED guards). Kill switch: `AUTO_INIT_EVENTS=false`.

See [`spec/server/cron.md`](../../spec/server/cron.md) for the full sequence.
