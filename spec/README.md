# Play The Cut — Specification (v4 platform)

Architecture and behavior documentation for the **v4 platform** (`v4` branch). This reflects the code as implemented today — not legacy tournament-centric production.

**Design intent:** [docs/platform-architecture.md](../docs/platform-architecture.md)  
**Ops:** [docs/event-activation-runbook.md](../docs/event-activation-runbook.md) (golf) · [docs/f1-event-activation-runbook.md](../docs/f1-event-activation-runbook.md) (F1) · [docs/platform-cutover-plan.md](../docs/platform-cutover-plan.md)

---

## What changed from legacy specs

| Area | Legacy (pre-v4) | Platform (v4) |
|------|-----------------|-----------------|
| Competition unit | `Tournament` | `CompetitionEvent` per sport |
| User roster | `TournamentLineup` + `TournamentPlayer` | `Lineup` + `LineupPick` → `EventParticipant` (many per user per event) |
| Contest FK | `tournamentId` | `eventId` |
| Contest entry FK | `tournamentLineupId` | `lineupId` |
| APIs | `/api/tournaments`, `/api/lineup` | `/api/sports`, `/api/lineups` |
| Sport logic | Inline PGA services | `SportModule` + `PropBetModule` plugins |
| Client routing | Tournament-centric home | `/sports/:sportId`, `/leagues/*` |

Legacy routes `/api/tournaments` and `/api/lineup` return **501** on v4.

---

## Production cutover

Platform code on `v4` is complete. Remaining ops work is staging validation and production cutover per [docs/platform-cutover-plan.md](../docs/platform-cutover-plan.md). Migration script: `server/src/scripts/migrate-from-legacy.ts`.

---

## Architecture walkthrough progress (optional — resume anytime)

Educational tour of `spec/`; separate from implementation phase numbers.

| # | Topic | Status |
|---|-------|--------|
| 1 | Platform product model | ✅ Done (incl. multi-lineup per event) |
| 2 | Plugin system + booting a sport | ✅ Done (incl. `RosterRules` / `RankedEntry` deep dive) |
| 3 | Server architecture | ✅ Done |
| 4 | Data models | ✅ Done |
| 5 | API reference | — See [server/api.md](server/api.md) |
| 6 | Services | ✅ Done |
| 7 | Cron pipeline | — See [server/cron.md](server/cron.md) |
| 8 | Client architecture | ✅ Done |
| 9 | Client components | [component-structure.md](client/component-structure.md) · [sport-ui-plugins.md](client/sport-ui-plugins.md) |
| 10 | Client data flow | Pending |
| 11 | Cross-layer | Pending |
| 12 | Contracts | Pending |

---

Use this order for a full architecture walkthrough:

| # | Doc | What you'll learn |
|---|-----|-------------------|
| 1 | [Platform overview](platform/README.md) | Product model, layers, package layout |
| 2 | [Plugin system](platform/plugins.md) | `SportModule`, `SportUIPlugin`, `PropBetModule` |
| 3 | [Server architecture](server/architecture.md) | Hono app, registries, request flow |
| 4 | [Data models](server/data-models.md) | Prisma schema (platform) |
| 5 | [API reference](server/api.md) | Live HTTP routes |
| 6 | [Services](server/services.md) | Business logic layout |
| 7 | [Cron pipeline](server/cron.md) | 5-minute multi-sport job |
| 8 | [Client architecture](client/architecture.md) | Providers, routing, sport context |
| 9 | [Client components](client/component-structure.md) | Platform shell vs sport UI |
| 9b | [Sport UI plugins](client/sport-ui-plugins.md) | `CandidateRow` / `ParticipantRow` boundaries, usage, legacy |
| 10 | [Client data flow](client/data-flow.md) | React Query, adapters, on-chain |
| 11 | [Cross-layer](cross-layer.md) | Auth, contests, settlement end-to-end |
| 12 | [Contracts](contracts/README.md) | On-chain layer (unchanged, sport-agnostic) |

### Deep dives (outside `spec/`)

| Topic | Doc |
|-------|-----|
| Side bet odds | [docs/side-bet-odds-methodology.md](../docs/side-bet-odds-methodology.md) |
| Side bet ops | [docs/SIDE_BET_PRODUCTION_PLAN.md](../docs/SIDE_BET_PRODUCTION_PLAN.md) |
| Tie-breakers | [docs/lineup-tie-breaker.md](../docs/lineup-tie-breaker.md) |
| Referrals | [docs/referral-network.md](../docs/referral-network.md) |
| Email program | [docs/email-program.md](../docs/email-program.md) |
| Competition fit | [docs/new-competition-fit-guide.md](../docs/new-competition-fit-guide.md) |
| Competition ideas | [docs/competition-shape-ideas.md](../docs/competition-shape-ideas.md) |

### Legacy / planning artifacts

| File | Status |
|------|--------|
| [analysis.md](analysis.md) | Pre-rewrite discovery notes — historical |
| [cleanup-backlog.md](cleanup-backlog.md) | Pre-rewrite cleanup list — largely superseded |
| [onboarding-content-plan.md](onboarding-content-plan.md) | Content planning — still useful |
| [docs/tournament-activation-runbook.md](../docs/tournament-activation-runbook.md) | **Deprecated** — use event runbook |

---

## Repo layout (v4)

```
packages/
  sport-sdk/           Shared types + SportModule, SportUIPlugin, PropBetModule interfaces
  sport-pga-golf/      PGA golf server plugin (ranking, validation, prop grading)
  secondary-pricing/   Bonding curve math (sport-agnostic)

server/
  src/sports/          Sport + prop bet registries, pga-golf handlers
  src/routes/          Hono routers (api.ts mounts live routes)
  src/services/        Platform business logic
  src/cron/            Scheduler
  prisma/              Platform schema

client/
  src/sports/          UI plugin registry + pga-golf components
  src/components/platform/   Sport-agnostic shell (picker, event header, lineup rows)
  src/pages/           Route pages
  src/hooks/           Data hooks (useSportData, bridges to legacy shapes where needed)

contracts/             Solidity (ContestController, Factory, tokens)
```

---

## Maintenance

- Update `spec/` when behavior changes on `v4`.
- [docs/platform-architecture.md](../docs/platform-architecture.md) is the design intent; `spec/` is the as-built reference.
