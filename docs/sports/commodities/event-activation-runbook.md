# Commodities event activation runbook

Operator checklist for activating a new **daily commodity session** on the v4 platform (`CompetitionEvent`, `sportId: commodities`). Users pick five contracts from a static 24-name catalog; lineup scores sum daily % moves.

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
| **Active flag** | `CompetitionEvent.isActive = true` (set by init; clears other active commodities events) |
| **Field sync** | 24 contracts (`EventParticipant` rows) |
| **Score sync** | Cron or manual pipeline — not part of init |
| **Data spike** | `pnpm --filter server run script:commodities-data-spike 2025-06-27` |
| **Dry run** | `pnpm --filter server run script:commodities-dry-run -- --fixture 2025-06-27` |
| **Sport hub** | `/sports/commodities` |

---

## Prerequisites

- [ ] **Trading day** confirmed — skip weekends and US market holidays
- [ ] **Sport row** exists — `pnpm --filter server run db:seed` creates `commodities` with `isEnabled: true`
- [ ] **Local DB** migrated
- [ ] **Yahoo access** — no API key; respect rate limits (see [data-sources.md](./data-sources.md))
- [ ] **Target environment** — confirm `DATABASE_URL` before init

### Environment variables

| Variable | Default | Notes |
|----------|---------|-------|
| `COMMODITIES_SESSION_TZ` | `America/New_York` | Session timezone |
| `COMMODITIES_SESSION_OPEN` | `09:30` | SCHEDULED → LIVE |
| `COMMODITIES_SESSION_CLOSE` | `16:00` | LIVE → COMPLETE |
| `YAHOO_FINANCE_BASE_URL` | `https://query1.finance.yahoo.com` | Override for tests |
| `COMMODITIES_USE_FIXTURE_PRICES` | unset | `true` for offline dry-run only |
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

If Yahoo rate-limits, retry after a few minutes or use fixture mode for local verification only:

```bash
pnpm --filter server run script:commodities-data-spike -- --fixture 2026-06-29
```

### 3. Init event

```bash
pnpm --filter server run service:init-event commodities 2026-06-29
```

Expected:
- `[commodities] Initialized event …`
- `CompetitionEvent.isActive = true`
- 24 `EventParticipant` rows

Verify:

```bash
# In Prisma Studio or SQL
# SELECT COUNT(*) FROM "EventParticipant" WHERE "eventId" = '…';
```

### 4. Race day (cron)

With `ENABLE_CRON=true`, the 5-minute pipeline will:
1. Refresh session metadata (open/close, `sessionComplete`)
2. Sync field (catalog is static; idempotent)
3. Sync live scores (open → current during LIVE; open → close at COMPLETE)
4. Recalculate contest lineups

During **SCHEDULED**, users build lineups. At **session open**, contests activate. After **session close**, contests settle.

### 5. Next trading day

Run init with the new `YYYY-MM-DD`. Init deactivates the previous commodities event automatically.

---

## Troubleshooting

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| Spike HTTP 429 | Yahoo rate limit | Wait 2–5 min; per-symbol sync is slow by design |
| Spike HTTP 401 on batch quote | Yahoo blocks multi-symbol quote | Chart API per symbol still works; see journal |
| Contract `total = 0` | Missing open/close price | Check symbol in Yahoo; DNP = 0 points |
| Event stuck SCHEDULED | Wall clock before `sessionOpen` | Expected; or check `COMMODITIES_SESSION_*` env |
| Event never COMPLETE | `sessionClose` not passed | Wait for close or verify timezone env |
| Field count ≠ 24 | Catalog/init error | Re-run init; check `commodityCatalog.ts` |

---

## Run log

| Date | externalId | Operator | Notes |
|------|------------|----------|-------|
| | | | |
