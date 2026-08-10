# Contest Status & Action Locking Guide

## Contest Status Lifecycle

```
OPEN → ACTIVE → LOCKED → SETTLED
  ↓      ↓        ↓
CANCELLED (from any pre-SETTLED state; or permissionless cancelExpired after expiry + grace)
```

### API / UI gates vs event status

**Primary join/leave and contest-scoped lineup edits follow `ContestController.state()`** (DB `Contest.status` only as RPC fallback). Event status (`SCHEDULED` / `LIVE` / `COMPLETE`) drives cron activate/settle only — it must not gate join, leave, or contest lineup APIs directly.

| Action | Allowed on-chain states | Helper |
|--------|-------------------------|--------|
| Join / `addPrimaryPosition` | `OPEN` | `canAddPrimaryPosition` |
| Leave / `removePrimaryPosition` | `OPEN` or `CANCELLED` | `canRemovePrimaryPosition` |
| Contest lineup create/edit | `OPEN` (same as join window) | `canAddPrimaryPosition` |
| Event-only lineup create/edit | Event not `LIVE`/`COMPLETE` | — |

Leaving a contest deletes the `ContestLineup` row; related `ContestLineupTimeline` snapshots cascade-delete so leave still works after live scoring has written timeline rows.

### Weekly Timeline

| Day/Time             | Event                   | Status Transition | What Happens                                                                |
| -------------------- | ----------------------- | ----------------- | --------------------------------------------------------------------------- |
| **Monday Morning**   | Contest Created         | → **OPEN**        | Contest becomes available. Users can join/leave, build lineups, buy shares. |
| **Thursday Morning** | Tournament Starts       | → **ACTIVE**      | Entries locked (no join/leave). Prediction market stays open (buy only).    |
| **Sunday Morning**   | Final Round (R4) Starts | → **LOCKED**      | All positions frozen. Prediction market closed. Awaiting final results.     |
| **Sunday Evening**   | Tournament Complete     | → **SETTLED**     | Results finalized. Winners can claim primary and secondary payouts.         |
| **After expiry + 1d** | Unsettled escape hatch | → **CANCELLED**   | Permissionless `cancelExpired` if operator never settled.                   |
