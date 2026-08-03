# Event activation runbook

Operator checklist for switching Play The Cut to a new competition week on the **platform schema** (`CompetitionEvent`, sport plugins). PGA Golf is the first supported sport; **Formula 1** has a dedicated runbook: [F1 event activation](../f1/event-activation-runbook.md). **Commodity Picks** (daily futures): [Commodities event activation](../commodities/event-activation-runbook.md). F1 uses OpenF1 Race `session_key` as `externalId` (not PGA Tour-style IDs).

**Related specs:** [email-program.md](../../operations/email-program.md) · tournament summary skill (`.cursor/skills/tournament-summary/SKILL.md`)

### pnpm command style

Pass script arguments **directly** — do **not** insert `--` before them. In this repo, `pnpm run script -- arg` fails; use `pnpm run script arg` instead.

---

## Quick reference

| Item | Value |
|------|--------|
| **Sport** | `pga-golf` (first plugin) |
| **externalId** | PGA Tour id — e.g. `R2026033` (`R{year}{event#}`) |
| **Summary** | `CompetitionEvent.metadata.summarySections` (via tournament-summary skill) |
| **Init command** | `pnpm run service:init-event pga-golf R2026033` |
| **Active flag** | `CompetitionEvent.isActive = true` (set by init) |
| **Admin dashboard** | `GET /api/admin/dashboard` (accepts `eventId` or `tournamentId` alias) |
| **Email preview** | `pnpm --filter server run script:email-preview new-tournament open` |
| **Email send** | `pnpm --filter server run script:send-blast new-tournament [--dry-run]` |

---

## Prerequisites

- [ ] **externalId** confirmed from [PGA Tour schedule](https://www.pgatour.com/schedule)
- [ ] **PGA field published** — init pulls the field from PGA; thin field if too early
- [ ] **DataGolf API key** in server env (rankings + tee times during init; side-bet quotes if enabled)
- [ ] **Local DB** running (`pnpm run db:start`) with platform schema migrated
- [ ] **MailerSend** configured only if sending email today

---

## Activation steps

### 1. Run `service:init-event`

```bash
pnpm run service:init-event pga-golf R__________
```

**What init does (PGA golf plugin):**

| Action | Detail |
|--------|--------|
| Event row | Upserts `CompetitionEvent` for `sportId` + `externalId` |
| Metadata | Name, dates, course, status via PGA APIs |
| Field | `EventParticipant` rows + participant profiles |
| Rankings | DataGolf rankings where configured |
| **isActive** | Clears other active events for the sport; sets this event active |

- [ ] Init completed without errors
- [ ] Log shows expected field size

---

### 2. Generate event summary (golf, optional)

Use the Cursor **tournament-summary** skill with the PGA external id (after init):

```
Generate a tournament summary for R__________
```

Writes `summarySections` onto the event's DB metadata (announcement card + in-app
preview + new-tournament email). Not required for field/scoring.

- [ ] Summary validated and written via `script:write-tournament-summary`
- [ ] In-app preview / email preview reviewed

---

### 3. Deploy target environment

Init and summary writes use the `DATABASE_URL` of the machine where commands run.

- [ ] Init (and optional summary) run against the intended environment
- [ ] Sport hub shows correct event name and dates

**Sync helpers (after withdrawals / tee-time changes):**

Both scripts default to the active golf event. Pass the internal `eventId` (UUID) only when syncing a non-active row.

```bash
pnpm run service:sync-event-metadata
pnpm run service:sync-event-field
```

Optional: `pnpm run service:sync-event-metadata <eventId>` or `pnpm run service:sync-event-field <eventId>`.

---

### 4. Verify in app

- [ ] Sport hub (`/sports/pga-golf`) shows correct event name and dates
- [ ] Event summary modal matches reviewed copy (if summary was written)
- [ ] Player field looks complete (spot-check favorites, WDs)
- [ ] Admin dashboard shows active event and ops hints
- [ ] Lineups can be created (`POST /api/lineups/:eventId`)

---

### 5. Contests & side bets (same week)

Not part of init — handle when the week opens.

| Task | How |
|------|-----|
| Open public contests | App create-contest flow or league manage tab |
| Activate contests | Cron (`batchActivateContests`) when `ENABLE_CRON=true` |
| Lock contests | Admin **Lock eligible contests** or `service:batch-lock-contests` |
| Settle / close contests | Cron when `ENABLE_CRON=true`, or batch CLI scripts |
| Side-bet quote refresh | Cron pipeline (`refreshOpenSideBetQuotes`) when `SIDE_BETS_ENABLED=true` + DataGolf key |
| Side-bet lock / settle / close | Admin panel (`/admin`) — manual ops |

---

### 6. Preview & send New Event email

Uses the active `CompetitionEvent` (same as production send). Override with `EVENT_ID` env if needed.

```bash
pnpm --filter server run script:email-preview new-tournament open
pnpm --filter server run script:send-blast new-tournament --dry-run
pnpm --filter server run script:send-blast new-tournament
```

- [ ] Preview reviewed (subject, summary sections, dates, CTA links)
- [ ] Dry-run recipient count looks right
- [ ] Live send completed (if sending today)

`EmailSendLog` records `eventId` for idempotency.

---

### 7. Ongoing week (cron)

Requires `ENABLE_CRON=true` on the API server or a dedicated `cron-app` process (see [`swarm/env/cron.env.example`](../swarm/env/cron.env.example)). Production Swarm keeps cron **off** on web replicas.

| Cadence | What runs |
|---------|-----------|
| Every 5 min | `scorePipeline` in `server/src/cron/scheduler.ts` |
| Every 20 min | `overviewPipeline` (golf commentary snapshot) |
| Continuous | `feedWorker` drains `CommentaryFeedJob` when commentary enabled |

Pipeline order:

1. **`runSportEventPipeline`** per `CompetitionEvent` with `isActive=true` — metadata, field, withdrawals; live scores + lineup updates when the sport says the event is live
2. **`refreshOpenSideBetQuotes`** — when `SIDE_BETS_ENABLED` and `DATAGOLF_API_KEY` are set
3. **`batchActivateContests`** — `OPEN` → `ACTIVE`
4. **`batchSettleContests`** — `ACTIVE` / `LOCKED` → `SETTLED`
5. **`batchSyncReferralGraph`**

**Post-expiry recovery (ops, not cron):** After on-chain expiry, the cold emergency-recovery wallet calls `emergencyRecoverFunds()` on the contest controller to reach `CLOSED` and sweep residual balance. See [wallet-roles-cashflows.md](../../operations/wallet-roles-cashflows.md).

**Admin only (not cron):** `batchLockContests` (`ACTIVE` → `LOCKED`), side-bet lock / settle / close.

Full spec: [`spec/server/cron.md`](../../../spec/server/cron.md). Status: `GET /api/cron/status`.

**Later in the week (manual emails):**

| Target | Command |
|--------|---------|
| Wednesday reminder | `script:send-blast reminder` |
| Sunday recap | `script:send-blast recap` |

---

## Run log

| Date | externalId | Operator | Notes |
|------|------------|----------|-------|
| | | | |
