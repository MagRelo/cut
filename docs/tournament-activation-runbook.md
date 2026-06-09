# Tournament activation runbook

Operator checklist for switching Play The Cut to a new PGA Tour week: content, database init, verification, and the New Tournament email.

**Related specs:** [email-program.md](./email-program.md) · tournament summary skill (`.cursor/skills/tournament-summary/SKILL.md`)

### pnpm command style

Pass script arguments **directly** — do **not** insert `--` before them. In this repo, `pnpm run script -- arg` fails; use `pnpm run script arg` instead. (`pnpm --filter server` is fine; script flags like `--dry-run` are fine.)

---

## Quick reference

| Item | Value |
|------|--------|
| **pgaTourId** | `R{year}{event#}` — e.g. `R2026033` |
| **Summary file** | `server/src/tournamentSummaries/{pgaTourId}.json` |
| **Init command** | `cd server && pnpm run service:init-tournament {pgaTourId}` |
| **Active flag** | `Tournament.manualActive = true` (set by init) |
| **Email preview** | `pnpm --filter server run script:email-preview new-tournament open` |
| **Email send** | `pnpm --filter server run script:send-blast new-tournament [--dry-run]` |

---

## Prerequisites

- [ ] **pgaTourId** confirmed from [PGA Tour schedule](https://www.pgatour.com/schedule) or DB
- [ ] **Tournament row** exists in DB (run `pnpm --filter server run db:seedPGA` if the season schedule is stale)
- [ ] **PGA field published** — init pulls the field from PGA; if the field is not out yet, wait or expect a thin init
- [ ] **DataGolf API key** set in server env (player rankings + tee times during init)
- [ ] **MailerSend** configured if sending email today (see `docs/email-implementation.md`)
- [ ] **Production deploy** — summary JSON must be on the server before init in prod (commit + deploy, or copy file)

---

## Activation steps

Work top to bottom. Check boxes as you go; add notes in [Run log](#run-log) at the bottom.

### 1. Generate tournament summary

Use the Cursor **tournament-summary** skill:

```
Generate a tournament summary for R__________
```

The skill will:

1. Resolve event details from PGA Tour
2. Research storylines, odds, history, broadcast
3. Write `server/src/tournamentSummaries/{pgaTourId}.json`
4. Validate JSON

**Manual validate** (from repo root):

```bash
node .cursor/skills/tournament-summary/scripts/validate-summary.mjs server/src/tournamentSummaries/R__________.json
```

- [ ] Summary JSON written
- [ ] Validator passes
- [ ] **Manual content review** — read Summary + Best Players and Odds; fix names, odds ranges, factual errors

**Operator notes:**

> _Add review notes here (withdrawals, odds source disagreements, copy tweaks)._

---

### 2. Commit summary (if deploying)

`initTournament` reads the JSON file from disk on the machine where the command runs.

- [ ] Summary committed to git
- [ ] Deployed to production (if activating prod)

---

### 3. Run `init-tournament`

```bash
cd server && pnpm run service:init-tournament R__________
```

**What init does:**

| Action | Detail |
|--------|--------|
| Metadata | Refreshes name, dates, course, status via PGA |
| Summary | Loads `{pgaTourId}.json` → `Tournament.summarySections` |
| Field | Sets `Player.inField`, creates missing players |
| Profiles | Updates in-field player profiles + DataGolf rankings |
| Tournament players | Creates `TournamentPlayer` rows |
| Tee times | Syncs from DataGolf field payload |
| Lineups | Bootstraps empty `TournamentLineup` rows for users who had lineups last week |
| **manualActive** | Clears all tournaments, sets **this** tournament `manualActive: true` |

- [ ] Init completed without errors
- [ ] Log shows expected field size
- [ ] No summary-file warning in log

**If field / tee times look wrong:**

```bash
pnpm --filter server run service:sync-field-withdrawals   # after WD announcements
# Re-run init or update-tournament as needed
```

---

### 4. Verify in app

- [ ] Home / tournament header shows correct name and dates
- [ ] Tournament summary modal matches reviewed JSON
- [ ] Player field list looks complete (spot-check favorites, recent WDs)
- [ ] Admin dashboard (`/admin`) shows this week’s tournament and ops hints
- [ ] Open contests (if any) are tied to the correct `tournamentId`

**Operator notes:**

> _UI issues, missing players, wrong dates._

---

### 5. Preview New Tournament email

Uses the DB tournament with `manualActive: true` (same as production send).

```bash
pnpm --filter server run script:email-preview new-tournament open
```

Review in browser:

- [ ] Subject line
- [ ] Summary sections render correctly (no truncation / bad encoding)
- [ ] Dates, course, location
- [ ] CTA links resolve to prod (or staging, if testing there)

**Operator notes:**

> _Email copy issues, broken links._

---

### 6. Send New Tournament blast

Dry run first:

```bash
pnpm --filter server run script:send-blast new-tournament --dry-run
```

When satisfied:

```bash
pnpm --filter server run script:send-blast new-tournament
```

- [ ] Dry run recipient count looks right
- [ ] Live send completed
- [ ] Spot-check inbox (personal + one test account)

`initTournament` does **not** send email. Send is always manual ([email-program.md](./email-program.md)).

To resend (rare): `--force` (bypasses per-tournament idempotency log).

---

### 7. Contests & parlays (same week)

Not part of init — handle separately when the week opens.

| Task | When | How |
|------|------|-----|
| Create contests | Before / early week | App: Create Contest (public or league admin) |
| Activate contests | After creation, before play | Cron `batchActivateContests` or admin tooling |
| Lock contests | Before tee-off / per rules | Admin: lock-eligible, or `service:batch-lock-contests` |
| Side bet markets | If feature enabled | Admin panel; see `docs/SIDE_BET_PRODUCTION_PLAN.md` |

- [ ] Contests created / carried forward
- [ ] Contest statuses checked on admin dashboard

---

### 8. Ongoing week (cron)

With `ENABLE_CRON=true` on the server:

| Cadence | Job |
|---------|-----|
| Every 5 min | `updateTournament`, escrow close, contest distribute |
| Every 5 min (when round In Progress / Complete) | `updateTournamentPlayers`, `updateContestLineups` |

Manual only: init, emails, contest lock (admin), side-bet lock/settle/close.

**Later in the week (manual emails):**

| Target | Command |
|--------|---------|
| Wednesday reminder | `script:send-blast reminder` |
| Sunday recap | `script:send-blast recap` |

---

## Troubleshooting

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| `Tournament not found` | No DB row for `pgaTourId` | `db:seedPGA`, confirm ID |
| Summary missing in app | No JSON file or init before file existed | Add JSON, re-run init |
| Empty / small field | PGA field not published | Wait, re-run init |
| DG ranking gaps in logs | Name mismatch or field-updates lag | Usually non-blocking; check odds/side bets |
| Email preview empty | No `manualActive` tournament | Run init first |
| Send skipped users | Already logged `NEW_TOURNAMENT` for this `tournamentId` | Use `--force` only if intentional |

---

## Run log

Fill in each activation. Copy the block for a new week.

### R__________ — _Tournament name_ — _YYYY-MM-DD_

| Step | Status | Notes |
|------|--------|-------|
| 1. Summary generated | ☐ | |
| 1b. Manual review | ☐ | |
| 2. Committed / deployed | ☐ | |
| 3. init-tournament | ☐ | |
| 4. App verification | ☐ | |
| 5. Email preview | ☐ | |
| 6. Email sent | ☐ | |
| 7. Contests / parlays | ☐ | |

**Issues / follow-ups:**

> _

---

## Open decisions

Items to nail down as we run activations:

- [ ] Standard day/time to send New Tournament email (relative to field release / Monday)
- [ ] Whether contests are recreated weekly or reused
- [ ] Prod deploy timing: summary-only deploy vs full release with init on server
- [ ] Side bet checklist as a subsection when live in prod
