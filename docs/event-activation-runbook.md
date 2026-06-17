# Event activation runbook

Operator checklist for switching Play The Cut to a new competition week on the **platform schema** (`CompetitionEvent`, sport plugins). PGA Golf is the first supported sport.

**Legacy doc:** [tournament-activation-runbook.md](./tournament-activation-runbook.md) (pre-rewrite `Tournament` model — reference only).

**Related specs:** [email-program.md](./email-program.md) · tournament summary skill (`.cursor/skills/tournament-summary/SKILL.md`)

### pnpm command style

Pass script arguments **directly** — do **not** insert `--` before them. In this repo, `pnpm run script -- arg` fails; use `pnpm run script arg` instead.

---

## Quick reference

| Item | Value |
|------|--------|
| **Sport** | `pga-golf` (first plugin) |
| **externalId** | PGA Tour id — e.g. `R2026033` (`R{year}{event#}`) |
| **Summary file** | `server/src/tournamentSummaries/{externalId}.json` |
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

### 1. Generate event summary (golf)

Use the Cursor **tournament-summary** skill with the PGA external id:

```
Generate a tournament summary for R__________
```

Writes `server/src/tournamentSummaries/{externalId}.json`.

- [ ] Summary JSON written and manually reviewed
- [ ] Validator passes (`node .cursor/skills/tournament-summary/scripts/validate-summary.mjs …`)

---

### 2. Commit summary (if deploying)

Init reads summary JSON from disk on the machine where the command runs.

- [ ] Summary committed
- [ ] Deployed to target environment (if not local)

---

### 3. Run `service:init-event`

```bash
pnpm run service:init-event pga-golf R__________
```

**What init does (PGA golf plugin):**

| Action | Detail |
|--------|--------|
| Event row | Upserts `CompetitionEvent` for `sportId` + `externalId` |
| Metadata | Name, dates, course, status via PGA APIs |
| Summary | Loads `{externalId}.json` → event metadata |
| Field | `EventParticipant` rows + participant profiles |
| Rankings | DataGolf rankings where configured |
| **isActive** | Clears other active events for the sport; sets this event active |

- [ ] Init completed without errors
- [ ] Log shows expected field size

**Sync helpers (after withdrawals / tee-time changes):**

```bash
pnpm run service:sync-event-metadata pga-golf R__________
pnpm run service:sync-participant-field pga-golf R__________
```

---

### 4. Verify in app

- [ ] Sport hub (`/sports/pga-golf`) shows correct event name and dates
- [ ] Event summary modal matches reviewed JSON
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
| Every 5 min | `mainPipeline` in `server/src/cron/scheduler.ts` |

Pipeline order:

1. **`runSportEventPipeline`** per `CompetitionEvent` with `isActive=true` — metadata, field, withdrawals; live scores + lineup updates when the sport says the event is live
2. **`refreshOpenSideBetQuotes`** — when `SIDE_BETS_ENABLED` and `DATAGOLF_API_KEY` are set
3. **`batchActivateContests`** — `OPEN` → `ACTIVE`
4. **`batchSettleContests`** — `ACTIVE` / `LOCKED` → `SETTLED`
5. **`batchCloseContests`** — `SETTLED` → `CLOSED` after expiry
6. **`batchSyncReferralGraph`**

**Admin only (not cron):** `batchLockContests` (`ACTIVE` → `LOCKED`), side-bet lock / settle / close.

Full spec: [`spec/server/cron.md`](../spec/server/cron.md). Status: `GET /api/cron/status`.

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
