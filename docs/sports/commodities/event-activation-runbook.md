# Commodities event activation runbook

Operator checklist for activating a commodity session on the v4 platform (`CompetitionEvent`, `sportId: commodities`). Users pick three Hyperliquid HIP-3 perps from a frozen field; lineup scores sum five daily legs with asymmetric up/down weighting.

**Related:** [competition-brief.md](./competition-brief.md) · [data-sources.md](./data-sources.md) · [Golf event activation](../golf/event-activation-runbook.md)

### pnpm command style

Pass script arguments **directly** — do **not** insert `--` before them. Use `pnpm --filter server run script:commodities-data-spike 2026-W27`, not `pnpm run script -- 2026-W27`.

---

## Quick reference

| Item | Value |
|------|--------|
| **Sport** | `commodities` |
| **externalId** | ISO week `YYYY-Www` — e.g. `2026-W27` |
| **Init command** | `pnpm --filter server run service:init-event commodities 2026-W27` |
| **Custom window** | `… commodities 2026-W27 --open +2m --close +62m` (local eval) |
| **Local cleanup** | `pnpm --filter server run script:commodities-cleanup-local` |
| **Enable sport** | Seed sets `isEnabled: false`; flip in Prisma Studio or use `script:commodities-local-eval` |
| **Active flag** | `CompetitionEvent.isActive = true` (set by init; clears other active commodities events) |
| **Field sync** | Up to 8 contracts (`EventParticipant` rows; frozen `fieldSnapshot` at init) |
| **Manual sync** | `service:sync-commodities-metadata` · `-field` · `-scores` |
| **Catalog sync** | `pnpm --filter server run script:commodities-catalog-sync` |
| **Score sync** | Cron every 5 min when LIVE, or `service:sync-commodities-scores` |
| **Data spike** | `pnpm --filter server run script:commodities-data-spike 2026-W27` |
| **Dry run** | `pnpm --filter server run script:commodities-dry-run 2026-W27` |
| **Local eval** | `pnpm --filter server run script:commodities-local-eval` |
| **Sport hub** | `/sports/commodities` |

---

## Prerequisites

- [ ] **HL markets available** — run `script:commodities-catalog-sync`; allowlist entries should resolve
- [ ] **Sport row** exists — `pnpm --filter server run db:seed` creates `commodities` with `isEnabled: false`
- [ ] **Sport enabled** — set `Sport.isEnabled = true` before users see commodities in `GET /api/sports`
- [ ] **Local DB** migrated
- [ ] **Target environment** — confirm `DATABASE_URL` before init

### Environment variables

| Variable | Default | Notes |
|----------|---------|-------|
| `COMMODITIES_SESSION_TZ` | `America/New_York` | Default session timezone when init omits `--open`/`--close` |
| `COMMODITIES_SESSION_OPEN` | `09:30` | Default SCHEDULED → LIVE time (time-only, session TZ) |
| `COMMODITIES_SESSION_CLOSE` | `16:30` | Default Friday close (time-only, session TZ) |
| `ENABLE_CRON` | — | `true` on cron worker for 5-minute pipeline |
| `DATABASE_URL` | — | Verify before every init |

---

## Safety

```bash
echo $DATABASE_URL
```

Init writes to whatever database `DATABASE_URL` points at.

---

## Activation steps

### 1. Enable sport (if not already)

```bash
pnpm --filter server run db:seed   # idempotent upsert
# Then set Sport.isEnabled = true for commodities in Prisma Studio,
# or use script:commodities-local-eval which enables + inits + opens a contest.
```

### 2. Pick session week

Use the **current ISO week** in `America/New_York` as `externalId`:

```
2026-W27
```

Week runs Monday 9:30 AM ET through Friday 4:30 PM ET.

### 3. Optional — data spike

```bash
pnpm --filter server run script:commodities-data-spike 2026-W27
```

Validates session-boundary scoring for allowlist tickers.

### 4. Init event

Default (full trading week from env — Mon 9:30 ET through Fri 4:30 PM ET):

```bash
pnpm --filter server run service:init-event commodities 2026-W27
```

Custom session window (short local eval, demo, etc.):

```bash
pnpm --filter server run service:init-event commodities 2026-W27 --open +2m --close +62m
pnpm --filter server run service:init-event commodities 2026-W27 --open 10:00 --close 14:00
pnpm --filter server run service:init-event commodities 2026-W27 --session-open 2026-06-29T14:00:00Z --session-close 2026-07-03T18:00:00Z
```

Expected:
- `[commodities] Initialized event …`
- `[commodities] Session open:` / `Session close:` log lines
- `CompetitionEvent.isActive = true`
- Up to 8 `EventParticipant` rows (liquid subset of allowlist)
- `metadata.commodities.sessionOpen` / `sessionClose` set at init and preserved by cron

Verify:

```bash
# In Prisma Studio or SQL
# SELECT COUNT(*) FROM "EventParticipant" WHERE "eventId" = '…';
```

### 5. Race day (cron)

With `ENABLE_CRON=true`, the 5-minute pipeline will:
1. Refresh session metadata (`sessionStarted`, `sessionComplete`, `currentPeriod` when open/close times pass)
2. Sync field (participants, quotes, sparklines)
3. Sync live scores when LIVE (five daily legs; skips when SCHEDULED or COMPLETE)
4. Recalculate contest lineups

During **SCHEDULED**, users build lineups. When cron marks **`sessionStarted`**, the event goes **LIVE**, lineups lock, and contests activate in the same pipeline pass. After cron marks **`sessionComplete`**, contests settle.

**Manual sync** (without waiting for cron):

```bash
pnpm --filter server run service:sync-commodities-metadata
pnpm --filter server run service:sync-commodities-field
pnpm --filter server run service:sync-commodities-scores   # LIVE only
```

Optional `eventId` as final argument on each command.

### 6. Next trading week

Run init with the new ISO week key (`YYYY-Www`). Init deactivates the previous commodities event automatically.

---

## Troubleshooting

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| Sport missing from nav/API | `isEnabled: false` | Enable sport row; re-seed if rules stale |
| Picker shows no prices/sparklines | Field sync not run | `service:sync-commodities-field` or re-init event |
| Contract `total = 0` | Missing open/close for a leg | Re-run score sync; DNP = 0 points per brief |
| Event stuck SCHEDULED after `sessionOpen` | Cron has not run since open | `service:sync-commodities-metadata` or wait for cron |
| Event shows LIVE but contest still OPEN | Cron has not activated yet | Same — status and activation flip together on next pipeline pass |
| Event never COMPLETE | `sessionClose` not passed | Wait for close; verify stored metadata bounds |
| Custom bounds reset | Re-init without flags on existing event | Re-init with explicit `--open`/`--close`; cron preserves bounds once set |
| Wrong weekday labels / sparkline columns after mid-week `--open` | Scores synced before ISO-week grid fix | `service:sync-commodities-scores` or wait for cron; verify `metadata.commodities.sessionDate` is the week's Monday |
| Field count ≠ expected | Catalog/init error | Re-run init; check `COMMODITY_METADATA_ALLOWLIST` and HL liquidity filter |

---

## Run log

| Date | externalId | Operator | Notes |
|------|------------|----------|-------|
| | | | |
