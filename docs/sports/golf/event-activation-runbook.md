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
| **Summary** | `CompetitionEvent.metadata.summarySections` (auto after Monday init; skill rewrite optional) |
| **Init command** | Auto: Monday 10:00 ET via cron. Manual: `pnpm run service:init-next-event pga-golf` or `pnpm run service:init-event pga-golf R2026033` |
| **Active flag** | `CompetitionEvent.isActive = true` (set by init unless `activate: false`) |
| **Admin dashboard** | `GET /api/admin/dashboard` (accepts `eventId` or `tournamentId` alias) |
| **Email preview** | `pnpm --filter server run script:email-preview contest-announcement open` |
| **Email send** | League admin creates a contest with **Email contest to league members** checked |

---

## Prerequisites

- [ ] Cron host has `ENABLE_CRON=true` (weekly Monday auto-init) or operator will run CLI
- [ ] **PGA field published** for the upcoming event — auto-init skips an empty field
- [ ] **DataGolf API key** in server env (rankings, tee times, sportsbook outrights for preview copy)
- [ ] `CURSOR_API_KEY` on the cron host if auto preview copy should write
- [ ] **Local DB** running (`pnpm run db:start`) with platform schema migrated when testing locally
- [ ] **MailerSend** configured only if sending email today

---

## Activation

### Auto-init (default)

Monday **10:00 America/New_York**, `eventInitPipeline` resolves the next PGA Tour event with a published field and runs `initGolfEvent`.

- If the active golf event is still **LIVE** or **SCHEDULED**, the next event is created with `activate: false` so the hub is not yanked. The 5-minute score pipeline promotes the prepared row when the live/current event is **COMPLETE** (Monday playoff or delayed finish).
- After init, missing `summarySections` are generated from event metadata, field, and DataGolf win outrights (no invented odds). Existing copy is left alone.
- Dry-run: `pnpm --filter server run service:init-next-event pga-golf --dry-run`

Kill switch: `AUTO_INIT_EVENTS=false`.

### Manual override

```bash
pnpm run service:init-event pga-golf R__________
pnpm --filter server run service:init-next-event pga-golf
```

**What init does (PGA golf plugin):**

| Action | Detail |
|--------|--------|
| Event row | Upserts `CompetitionEvent` for `sportId` + `externalId` |
| Metadata | Name, dates, course, status via PGA APIs |
| Field | `EventParticipant` rows + participant profiles |
| Rankings | DataGolf rankings where configured |
| **isActive** | Default: clears other active golf events and sets this event active. `activate: false` prepares the row without flipping a LIVE or SCHEDULED event. |

- [ ] Init completed without errors
- [ ] Log shows expected field size

---

### Generate event summary (optional rewrite)

Auto-init writes a CutBot preview when `CURSOR_API_KEY` is set. For a researched rewrite (broadcast windows, extra quotes), use the Cursor **tournament-summary** skill:

```
Generate a tournament summary for R__________
```

Writes `summarySections` onto the event's DB metadata (announcement card + in-app
preview + contest announcement email) and refreshes `metadata.emailAnnouncement`.
Not required for field/scoring.

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

- [ ] Contests hub (`/contests`) shows the event name and dates
- [ ] Event summary modal matches reviewed copy (if summary was written)
- [ ] Player field looks complete (spot-check favorites, WDs)
- [ ] Admin dashboard shows active event and ops hints
- [ ] Lineups can be created (`POST /api/lineups/:eventId`)

---

### 5. Contests (same week)

Not part of init — handle when the week opens.

| Task | How |
|------|-----|
| Open public contests | App create-contest flow or league manage tab |
| Activate contests | Cron (`batchActivateContests`) when `ENABLE_CRON=true` |
| Lock contests | Admin **Lock eligible contests** or `service:batch-lock-contests` |
| Settle / close contests | Cron when `ENABLE_CRON=true`, or batch CLI scripts |

---

### 6. Contest announcement email

Init prepares `CompetitionEvent.metadata.emailAnnouncement`. League admins send it
when they create a contest (checkbox default on). Preview the prepared copy:

```bash
pnpm --filter server run script:email-preview contest-announcement open
```

- [ ] Preview reviewed (subject uses a fixture league name; live send uses the real league)
- [ ] MailerSend configured on the environment that will create contests

`EmailSendLog` records `CONTEST_ANNOUNCEMENT:{contestId}:{userId}`.

---

### 7. Ongoing week (cron)

Requires `ENABLE_CRON=true` on the API server or a dedicated `cron-app` process (see [`swarm/env/cron.env.example`](../swarm/env/cron.env.example)). Production Swarm keeps cron **off** on web replicas.

| Cadence | What runs |
|---------|-----------|
| Every 5 min | `scorePipeline` in `server/src/cron/scheduler.ts` (promotes a prepared golf event when the active one is COMPLETE) |
| Daily 10:00 ET | `eventInitPipeline` — Monday next PGA event |
| Every 20 min | `overviewPipeline` (golf commentary snapshot) |
| Continuous | `feedWorker` drains `CommentaryFeedJob` when commentary enabled |

Pipeline order:

1. **`maybePromotePreparedGolfEvent`** — if active golf is COMPLETE, activate a later prepared event
2. **`runSportEventPipeline`** per `CompetitionEvent` with `isActive=true` — metadata, field, withdrawals; live scores + lineup updates when the sport says the event is live
3. **`batchActivateContests`** — `OPEN` → `ACTIVE`
4. **`batchSettleContests`** — `ACTIVE` / `LOCKED` → `SETTLED`
5. **`batchSyncReferralGraph`**
6. **`flushPendingContestAnnouncementEmails`** — retries leftover league contest announcement sends

**Post-expiry escape hatch:** If the operator never settles, permissionless `cancelExpired()` unlocks after `expiryTimestamp + SETTLEMENT_GRACE_PERIOD` (1 day). See [wallet-roles-cashflows.md](../../operations/wallet-roles-cashflows.md).

**Admin only (not cron):** `batchLockContests` (`ACTIVE` → `LOCKED`).

Full spec: [`spec/server/cron.md`](../../../spec/server/cron.md). Status: `GET /api/cron/status`.

---

## Run log

| Date | externalId | Operator | Notes |
|------|------------|----------|-------|
| 2026-08-25 | R2026060 | matt | TOUR Championship (East Lake); 30-player field; active; summarySections written |
