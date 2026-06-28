# F1 event activation runbook

Operator checklist for activating a new Formula 1 Grand Prix on the v4 platform (`CompetitionEvent`, `sportId: f1`). Race-day only — qualifying and sprint sessions are not scored in v1.

**Related:** [competition-brief.md](./competition-brief.md) · [data-sources.md](./data-sources.md) · [Golf event activation](../golf/event-activation-runbook.md) (PGA)

### pnpm command style

Pass script arguments **directly** — do **not** insert `--` before them. In this repo, `pnpm run script -- arg` fails; use `pnpm run script arg` instead. (`pnpm --filter server` is fine; script flags like `--dry-run` are fine.)

Run server commands from repo root with `pnpm --filter server run …` or from `server/` with `pnpm run …`.

---

## Quick reference

| Item | Value |
|------|--------|
| **Sport** | `f1` |
| **externalId** | OpenF1 Race `session_key` — e.g. `9558` (2024 British GP) |
| **Session lookup** | `pnpm --filter server run script:f1-list-races 2026` |
| **Init command** | `pnpm --filter server run service:init-event f1 9558` |
| **Active flag** | `CompetitionEvent.isActive = true` (set by init; clears other active F1 events) |
| **Field sync** | ~20 drivers (`EventParticipant` rows) |
| **Score sync** | Not part of init — cron or `service:sync-f1-scores` |
| **Dry run** | `pnpm --filter server run script:f1-dry-run 9558` |
| **Data spike** | `pnpm --filter server run script:f1-data-spike 9558` |
| **Sport hub** | `/sports/f1` |
| **Admin dashboard** | `GET /api/admin/dashboard` (pass `eventId` if needed) |

---

## Prerequisites

- [ ] **session_key** confirmed — see [Resolve session_key](#1-resolve-session_key) below
- [ ] **Sport row** exists — `pnpm --filter server run db:seed` creates `Sport` id `f1` with `isEnabled: true`
- [ ] **Local DB** running with platform schema migrated
- [ ] **OpenF1 access** — no API key required for historical/post-race sync; live race window needs `OPENF1_API_TOKEN` (paid tier)
- [ ] **Target environment** — confirm `DATABASE_URL` points at the intended DB before init (see [Safety](#safety))

### Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `OPENF1_API_TOKEN` | No (historical) | Bearer token for live session window (~30 min pre/post race) |
| `JOLPICA_BASE_URL` | No | Default `https://api.jolpi.ca/ergast/f1` |
| `ENABLE_CRON` | Prod race day | `true` on cron worker for 5-minute pipeline |
| `DATABASE_URL` | Yes | Verify before every init |

Full data API notes: [data-sources.md](./data-sources.md).

---

## Safety

Init writes to whatever database `DATABASE_URL` points at. Before running in any shared environment:

```bash
# Confirm target
echo $DATABASE_URL

# Local expected pattern
# postgresql://playthecut:playthecut@localhost:5432/playthecut
```

---

## Activation steps

Work top to bottom. Check boxes as you go; add notes in [Run log](#run-log) at the bottom.

### 1. Resolve session_key

F1 `externalId` is the OpenF1 **Race** `session_key` (plain integer). Golf uses PGA Tour IDs — conventions differ by sport.

```bash
pnpm --filter server run script:f1-list-races 2026
```

| Column | Use |
|--------|-----|
| `session_key` | Copy into `init-event` command — this becomes `CompetitionEvent.externalId` |
| `country` / `circuit` | Confirm you picked the right Grand Prix |
| `date_start` | Race start time (UTC) |

**Examples:**

| Race | session_key | Init |
|------|-------------|------|
| British GP 2024 | `9558` | `service:init-event f1 9558` |
| Monaco GP 2026 | *(run list-races)* | `service:init-event f1 <key>` |

- [ ] Race `session_key` copied from list-races output
- [ ] Optional: spike API connectivity before init:

```bash
pnpm --filter server run script:f1-data-spike 9558
```

**Event preview JSON (optional, not in v1):** Golf loads `server/src/tournamentSummaries/{externalId}.json` at init. F1 has no equivalent pipeline yet — event name, dates, and circuit come from OpenF1/Jolpica metadata.

---

### 2. Seed sport (first time only)

```bash
pnpm --filter server run db:seed
```

- [ ] `Sport` row `id: f1` exists with `isEnabled: true`, `minPicks: 4`, `maxPicks: 4`

---

### 3. Run `service:init-event`

```bash
pnpm --filter server run service:init-event f1 <session_key>
```

**What init does (F1 plugin):**

| Action | Detail |
|--------|--------|
| Event row | Upserts `CompetitionEvent` for `sportId=f1` + `externalId` |
| Metadata | Race name, season, round, `meetingKey`, `sessionKey`, `raceStart` via OpenF1 + Jolpica |
| Field | ~20 `EventParticipant` rows + driver profiles |
| **isActive** | Clears other active F1 events; sets this event active |
| **Scores** | **Not synced** — run sync or wait for cron after race starts / completes |

- [ ] Init completed without errors
- [ ] Log shows ~20 drivers synced
- [ ] `CompetitionEvent.isActive = true` for this event

**Sync helpers** (optional eventId = Prisma cuid; defaults to active F1 event):

```bash
pnpm --filter server run service:sync-f1-metadata
pnpm --filter server run service:sync-f1-field
pnpm --filter server run service:sync-f1-scores
```

---

### 4. Verify in app

- [ ] Sport hub (`/sports/f1`) shows correct race name and start time
- [ ] Driver field ~20 entries (spot-check favorites, numbers)
- [ ] Lineups can be created — 4 drivers + `winningLineupTotal` prediction (1–120)
- [ ] Admin dashboard shows active F1 event

**Before race:** scores may be null — expected. Grid positions may be null for historical races if OpenF1 `starting_grid` is empty.

**After race / historical replay:**

```bash
pnpm --filter server run service:sync-f1-scores
```

- [ ] Driver totals populated (e.g. winner 25 pts)
- [ ] Fastest-lap bonus reflected in totals (Sainz P5 = 11 at 2024 British GP)

---

### 5. Contests

Not part of init — open when the race week goes live.

| Task | How |
|------|-----|
| Open public contests | App create-contest flow or league manage tab |
| Activate contests | Cron `batchActivateContests` when event status is `LIVE` |
| Lock contests | Admin **Lock eligible contests** or `service:batch-lock-contests` |
| Settle / close contests | Cron when event is `COMPLETE`, or batch CLI scripts |
| Side bets | **Not supported** for F1 in v1 |

**Contest lifecycle (F1):**

| Event status | Contest behavior |
|--------------|------------------|
| `SCHEDULED` | Contests `OPEN`; lineups editable |
| `LIVE` | Cron activates `OPEN` → `ACTIVE`; lineup lock at race start |
| `COMPLETE` | Cron settles `ACTIVE` / `LOCKED` → `SETTLED` |

Testnet off-chain settlement (no on-chain tx): see `server/src/scripts/settleContestOffChain.ts`.

---

### 6. End-to-end dry run (dev / staging)

Validates lineups, scoring, ranking, and tie-break without a live race:

```bash
pnpm --filter server run script:f1-dry-run 9558
```

Cleanup test artifacts:

```bash
pnpm --filter server run script:f1-dry-run -- --cleanup
```

- [ ] Leaderboard order and tie-break match expectations
- [ ] `batchActivateContests` skips when event is `COMPLETE` (not `LIVE`)

---

### 7. Email blast (optional)

Email templates are **golf-oriented** today (`course`, `city`, `state` in metadata). F1 activation does not require email.

If sending a race-week blast anyway:

```bash
EVENT_ID=<f1-event-cuid> pnpm --filter server run script:email-preview new-tournament open
EVENT_ID=<f1-event-cuid> pnpm --filter server run script:send-blast new-tournament --dry-run
```

- [ ] Preview reviewed — expect sparse location/subtitle for F1 until sport-specific email work lands
- [ ] `EVENT_ID` set explicitly (defaults to active **golf** event if omitted)

Future: F1-specific blast copy and metadata mapping — tracked as optional in expansion checklist.

---

### 8. Race day & ongoing (cron)

Requires `ENABLE_CRON=true` on the API server or dedicated `cron-app` process. See [`swarm/env/cron.env.example`](../swarm/env/cron.env.example).

| Cadence | What runs |
|---------|-----------|
| Every 5 min | `mainPipeline` in `server/src/cron/scheduler.ts` |

Pipeline order (same as golf):

1. **`runSportEventPipeline`** per active event — metadata, field; live scores + contest lineup updates when F1 status is `LIVE` or `COMPLETE`
2. **`refreshOpenSideBetQuotes`** — golf only (`SIDE_BETS_ENABLED`)
3. **`batchActivateContests`** — `OPEN` → `ACTIVE` when event is `LIVE`
4. **`batchSettleContests`** — when event is `COMPLETE`
5. **`batchCloseContests`**
6. **`batchSyncReferralGraph`**

**F1 scoring notes during LIVE:**

- Provisional points from running position until `session_result` is published
- UI may label provisional vs final scores
- Post-race penalties may delay `COMPLETE` until OpenF1 publishes final classification

Full spec: [`spec/server/cron.md`](../../../spec/server/cron.md). Status: `GET /api/cron/status`.

**Manual score refresh** (if cron is off):

```bash
pnpm --filter server run service:sync-f1-scores
pnpm --filter server run service:update-contest-lineups
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Invalid F1 externalId` | Non-numeric or slug-style ID | Use Race `session_key` from `script:f1-list-races` |
| `not a Race session` | Qualifying/practice key passed | Re-run list-races; pick `session_type=Race` row |
| Init finds 0 drivers | Wrong session_key or API outage | Run data spike; verify key in OpenF1 |
| Scores all null after init | Expected — init does not sync scores | Run `service:sync-f1-scores` or wait for cron |
| Grid positions null | OpenF1 `starting_grid` empty for session | Cosmetic for v1; sort falls back to standings |
| Contest won't activate | Event not `LIVE` yet | Wait for race start; check metadata `raceStart` |
| Contest won't settle | Event not `COMPLETE` or no on-chain contract | Sync scores; verify classification flag |
| Any OpenF1 401 during race weekend | Live session in progress — OpenF1 blocks unauthenticated access globally (even for historical `session_key`) | Wait for session to end, or set `OPENF1_API_TOKEN` |
| HTTP 429 from OpenF1 | Rate limit | Backoff; cron interval is usually sufficient |

---

## Run log

| Date | session_key | Operator | Notes |
|------|-------------|----------|-------|
| 2026-06-28 | `9558` | Stage 8 dry run | Local dev; `script:f1-dry-run` passed |
| 2026-06-27 | *(legacy slug)* | Local activation | Superseded by OpenF1 session_key convention |
