# Commodities event activation runbook

Operator checklist for activating a commodity session on the v4 platform (`CompetitionEvent`, `sportId: commodities`). Users pick five Hyperliquid HIP-3 perps from a frozen field; lineup scores sum session % moves between `sessionOpen` and `sessionClose`.

**Related:** [competition-brief.md](./competition-brief.md) · [data-sources.md](./data-sources.md) · [COMMODITIES_JOURNAL.md](../../../COMMODITIES_JOURNAL.md) · [Golf event activation](../golf/event-activation-runbook.md)

### pnpm command style

Pass script arguments **directly** — do **not** insert `--` before them. Use `pnpm --filter server run script:commodities-data-spike 2025-06-27`, not `pnpm run script -- 2025-06-27`.

---

## Quick reference

| Item | Value |
|------|--------|
| **Sport** | `commodities` |
| **externalId** | ISO date `YYYY-MM-DD` — e.g. `2026-06-29` |
| **Init command** | `pnpm --filter server run service:init-event commodities 2026-06-29` |
| **Custom window** | `… commodities 2026-06-29 --open 10:00 --close 14:00` |
| **Local cleanup** | `pnpm --filter server run script:commodities-cleanup-local` |
| **Active flag** | `CompetitionEvent.isActive = true` (set by init; clears other active commodities events) |
| **Field sync** | ~14 contracts (`EventParticipant` rows; frozen `fieldSnapshot` at init) |
| **Catalog sync** | `pnpm --filter server run script:commodities-catalog-sync` |
| **Score sync** | Cron or manual pipeline — not part of init |
| **Data spike** | `pnpm --filter server run script:commodities-data-spike 2025-06-27` |
| **Dry run** | `pnpm --filter server run script:commodities-dry-run 2025-06-27` |
| **Local eval** | `pnpm --filter server run script:commodities-local-eval` |
| **Sport hub** | `/sports/commodities` |

---

## Prerequisites

- [ ] **HL markets available** — run `script:commodities-catalog-sync`; allowlist entries should resolve
- [ ] **Sport row** exists — `pnpm --filter server run db:seed` creates `commodities` with `isEnabled: true`
- [ ] **Local DB** migrated
- [ ] **Target environment** — confirm `DATABASE_URL` before init

### Environment variables

| Variable | Default | Notes |
|----------|---------|-------|
| `COMMODITIES_SESSION_TZ` | `America/New_York` | Default session timezone when init omits `--open`/`--close` |
| `COMMODITIES_SESSION_OPEN` | `09:30` | Default SCHEDULED → LIVE time (time-only, session TZ) |
| `COMMODITIES_SESSION_CLOSE` | `16:00` | Default LIVE → COMPLETE time (time-only, session TZ) |
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

### 1. Pick session date

Use **today's trading date** in `America/New_York` as `externalId`:

```
2026-06-29
```

Do not init on Saturday/Sunday or known NYSE holidays.

### 2. Optional — data spike

```bash
pnpm --filter server run script:commodities-data-spike 2026-06-29
```

Validates fixture scoring for all 24 catalog symbols on the session date.

### 3. Init event

Default (full trading day from env):

```bash
pnpm --filter server run service:init-event commodities 2026-06-29
```

Custom session window (1-hour demo, half-day, etc.):

```bash
pnpm --filter server run service:init-event commodities 2026-06-29 --open 10:00 --close 14:00
pnpm --filter server run service:init-event commodities 2026-06-29 --session-open 2026-06-29T14:00:00Z --session-close 2026-06-29T18:00:00Z
```

Expected:
- `[commodities] Initialized event …`
- `[commodities] Session open:` / `Session close:` log lines
- `CompetitionEvent.isActive = true`
- 24 `EventParticipant` rows
- `metadata.commodities.sessionOpen` / `sessionClose` set at init and preserved by cron

Verify:

```bash
# In Prisma Studio or SQL
# SELECT COUNT(*) FROM "EventParticipant" WHERE "eventId" = '…';
```

### 4. Race day (cron)

With `ENABLE_CRON=true`, the 5-minute pipeline will:
1. Refresh session metadata (`sessionStarted`, `sessionComplete` when open/close times pass)
2. Sync field (catalog is static; idempotent)
3. Sync live scores (open → current during LIVE; open → close at COMPLETE)
4. Recalculate contest lineups

During **SCHEDULED**, users build lineups. When cron marks **`sessionStarted`**, the event goes **LIVE**, lineups lock, and contests activate in the same pipeline pass. After cron marks **`sessionComplete`**, contests settle.

### 5. Next trading day

Run init with the new `YYYY-MM-DD`. Init deactivates the previous commodities event automatically.

---

## Troubleshooting

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| Picker shows no prices/sparklines | Field sync not run | `pnpm --filter server run script:commodities-local-eval` or re-init event |
| Contract `total = 0` | Missing open/close in score data | Re-run pipeline; DNP = 0 points per brief |
| Event stuck SCHEDULED after `sessionOpen` | Cron has not run since open | Wait for cron (5 min) or run pipeline manually; verify `sessionStarted` in metadata |
| Event shows LIVE but contest still OPEN | Cron has not activated yet | Same — status and activation flip together on the next pipeline pass |
| Event never COMPLETE | `sessionClose` not passed | Wait for close; verify stored metadata bounds |
| Custom bounds reset | Re-init without flags on existing event | Re-init with explicit `--open`/`--close`; cron preserves bounds once set |
| Field count ≠ 24 | Catalog/init error | Re-run init; check `commodityCatalog.ts` |

---

## Run log

| Date | externalId | Operator | Notes |
|------|------------|----------|-------|
| | | | |
