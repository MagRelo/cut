# Contest Status & Action Locking Guide

## Contest Status Lifecycle

```
OPEN → ACTIVE → LOCKED → SETTLED → CLOSED
                   ↓
              CANCELLED (from any pre-SETTLED state)
```

### Weekly Timeline

| Day/Time             | Event                   | Status Transition | What Happens                                                                |
| -------------------- | ----------------------- | ----------------- | --------------------------------------------------------------------------- |
| **Monday Morning**   | Contest Created         | → **OPEN**        | Contest becomes available. Users can join/leave, build lineups, buy shares. |
| **Thursday Morning** | Tournament Starts       | → **ACTIVE**      | Entries locked (no join/leave). Prediction market stays open (buy only).    |
| **Sunday Morning**   | Final Round (R4) Starts | → **LOCKED**      | All positions frozen. Prediction market closed. Awaiting final results.     |
| **Sunday Evening**   | Tournament Complete     | → **SETTLED**     | Results finalized. Winners can claim primary and secondary payouts.         |
| **Following Sunday** | Expiry Reached          | → **CLOSED**      | Contest archived. All claims processed or forfeited.                        |
