# Play The Cut — Specification (v4 platform)

Architecture and behavior documentation for the **v4 platform** (`v4` branch). This reflects the code as implemented today — not legacy tournament-centric production.

**Design intent:** [docs/platform/architecture.md](../docs/platform/architecture.md)  
**Ops:** [docs/sports/golf/event-activation-runbook.md](../docs/sports/golf/event-activation-runbook.md) (golf) · [docs/sports/f1/event-activation-runbook.md](../docs/sports/f1/event-activation-runbook.md) (F1) · [docs/README.md](../docs/README.md)

---

## What changed from legacy specs

| Area | Legacy (pre-v4) | Platform (v4) |
|------|-----------------|-----------------|
| Competition unit | `Tournament` | `CompetitionEvent` per sport |
| User roster | `TournamentLineup` + `TournamentPlayer` | `Lineup` + `LineupPick` → `EventParticipant` (many per user per event) |
| Contest FK | `tournamentId` | `eventId` |
| Contest entry FK | `tournamentLineupId` | `lineupId` |
| APIs | `/api/tournaments`, `/api/lineup` | `/api/sports`, `/api/lineups` |
| Sport logic | Inline PGA services | `SportModule` plugins |
| Client routing | Tournament-centric home | `/contests`, `/leagues/*` |

The v4 server does not mount `/api/tournaments` or `/api/lineup`. The route list is [server/api.md](server/api.md).

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
| 2 | [Plugin system](platform/plugins.md) | `SportModule`, `SportUIPlugin` |
| 3 | [Server architecture](server/architecture.md) | Hono app, registries, request flow |
| 4 | [Data models](server/data-models.md) | Prisma schema (platform) |
| 5 | [API reference](server/api.md) | Live HTTP routes |
| 5b | [Agent protocol](agent/agents.md) | P-256 `x-cut-*` signing and `@playthecut/agent` |
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
| Tie-breakers | [docs/platform/lineup-tie-breaker.md](../docs/platform/lineup-tie-breaker.md) |
| Referrals | [docs/platform/referral-network.md](../docs/platform/referral-network.md) |
| Email program | [docs/operations/email-program.md](../docs/operations/email-program.md) |
| Competition fit | [docs/competitions/fit-guide.md](../docs/competitions/fit-guide.md) |
| Competition ideas | [docs/competitions/shape-ideas.md](../docs/competitions/shape-ideas.md) |

### Legacy / planning artifacts

| File | Status |
|------|--------|
| [analysis.md](analysis.md) | Pre-rewrite discovery notes — historical |
| [cleanup-backlog.md](cleanup-backlog.md) | Pre-rewrite cleanup list — largely superseded |
| [onboarding-content-plan.md](onboarding-content-plan.md) | Live `/onboarding` copy and gate |
| [platform/sport-package-ingress.md](platform/sport-package-ingress.md) | Move data ingress into sport packages — active roadmap |

---

## Repo layout (v4)

```
packages/
  sport-sdk/           Shared types + SportModule, SportUIPlugin interfaces
  sport-pga-golf/      PGA golf server plugin (ranking, validation)
  secondary-pricing/   Bonding curve math (sport-agnostic)
  agent/               @playthecut/agent. Protocol is spec/agent/agents.md

server/
  src/sports/          Sport registries, pga-golf handlers
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
- [docs/platform/architecture.md](../docs/platform/architecture.md) is the design intent; `spec/` is the as-built reference.
- Agent protocol is [agent/agents.md](agent/agents.md). The route list is [server/api.md](server/api.md). `pnpm run agent:release` copies those pages into `@playthecut/agent` (`README.md`, `docs/agents.md`, `docs/api.md`) and `client/public`.
- A change to `packages/agent/src` or those spec pages ships as a new patch once that version is on npm or already staged. `agent:release` reads the packument and `npm stage list` first. A version that is not published and not staged keeps its number. The step writes `packages/agent/release.json` with the version and content hash. After a successful stage it also records `staged` for that same hash, so the next deploy does not bump again.
- `pnpm run agent:publish` checks the stage list before it posts. A version already on npm is left alone. A version already staged for this same hash prints `npm stage approve <id>`. npm allows one candidate per version and rejects a second stage with 409, including after the candidate has left the list. On that 409 the publish step bumps the patch and stops. The next `pnpm run deploy` stages the new version.
- `pnpm run deploy` runs release, check, build, then publish. Approve the staged package before it is installable. `pnpm run agent:check` fails when the copies or the release hash do not match.
- npm stores the commit of each published version as `gitHead`. The stamp writes that same commit to `packages/agent/release.json` as `git`. `pnpm run agent:since` lists commits since the last published version. Commits that touch `packages/agent/src` or the agent spec pages are the ones that ship in the next package. Other commits do not release the agent.
