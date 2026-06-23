# Platform cutover plan

Operational reference for moving production from the legacy golf-only stack to the v4 platform deployment. This document is not executed as part of routine development — run these steps only during a scheduled maintenance window.

---

## Preconditions

- Phase 9 migration script validated on a production DB snapshot (`--dry-run`, `--apply`, `--validate` all pass).
- Architecture cleanup merged on `v4` (platform types only; legacy routes removed).
- Staging dry-run completed against migrated data with smoke tests passing.
- Maintenance window scheduled **between PGA events** (no active tournament in progress).

---

## Environment

| Variable | Cutover host |
|----------|--------------|
| `DATABASE_URL` | New v4 Postgres (empty schema before migrate) |
| `LEGACY_DATABASE_URL` | Final prod snapshot (read-only) |
| `ENABLE_CRON` | `false` on API during migration; `true` on cron host after cutover |
| Privy / chain / RPC | Same as current production |

---

## Cutover sequence

### 1. Freeze legacy production

1. Enable maintenance mode on the legacy app (or stop serving traffic).
2. Stop the legacy cron worker so scores and settlements do not advance during migration.
3. Take a **final** production database snapshot.

### 2. Migrate data

On a migration host with access to both databases:

```bash
pnpm --filter server exec prisma migrate deploy
```

Configure `LEGACY_DATABASE_URL` (final snapshot) and `DATABASE_URL` (v4 target).

```bash
pnpm --filter server run script:migrate-from-legacy --dry-run
pnpm --filter server run script:migrate-from-legacy --apply
pnpm --filter server run script:migrate-from-legacy --validate
```

Expect: `Preflight validation passed.` and `Reconciliation passed.`

### 3. Deploy v4

1. Build and deploy the v4 Docker image per `swarm/README.md`.
2. Point `DATABASE_URL` at the migrated database.
3. Run `prisma migrate deploy` once on the new stack (idempotent).
4. Do **not** start cron until traffic is switched and smoke tests pass.

### 4. Switch traffic

1. Update DNS / load balancer to the v4 deployment.
2. Verify health endpoint responds.
3. Start the cron worker (`ENABLE_CRON=true`) against the new `DATABASE_URL`.

### 5. Smoke checklist

| Area | Check |
|------|-------|
| Auth | Login, wallet provisioning, token balance |
| Active event | `GET /api/sports/pga-golf/events/active` returns current tournament |
| Candidates | Field loads; leaderboard scores reasonable |
| Lineups | List, create, edit picks for active event |
| Contests | List, join, leave, lobby timeline |
| On-chain | Sample `Contest.address` and `ContestLineup.entryId` match chain state |
| Side bets | Open markets load; ticket history intact (if enabled) |
| Admin | Dashboard loads for active event |
| Email | No duplicate blasts (`EmailSendLog` dedupe) |

### 6. Manual validation (not in migration script)

- Stableford totals on sample lineups vs legacy prod (spot check).
- Null winning-score predictions / tie-breaker behavior.
- Contest settlement path on a recently completed event (if applicable).

---

## Rollback

If critical issues appear within the maintenance window:

1. Stop v4 cron immediately.
2. Revert DNS / load balancer to the legacy stack.
3. Legacy database snapshot remains unchanged — do **not** run v4 cron against the legacy schema.
4. Document the failure mode before attempting a second cutover.

---

## Post-cutover

- Monitor contest score updates, on-chain settlement, and side-bet quote refresh for one full event cycle.
- Remove any remaining transitional API aliases (`tournamentId` query params) in a follow-up PR.
- Archive the legacy deployment after one stable event.

---

## Related docs

- [PLATFORM_REWRITE.md](../PLATFORM_REWRITE.md) — implementation tracker
- [PLATFORM_ARCHITECTURE.md](../PLATFORM_ARCHITECTURE.md) — target design
- [event-activation-runbook.md](./event-activation-runbook.md) — post-cutover event ops
- [swarm/README.md](../swarm/README.md) — deployment commands
