# Documentation index

Product, operations, and sport-specific reference for Play The Cut. For as-built technical specs (APIs, cron, plugins), see [`spec/README.md`](../spec/README.md).

## Platform

| Doc | Purpose |
|-----|---------|
| [architecture.md](platform/architecture.md) | Multi-sport platform design intent |
| [consensus-axis.md](platform/consensus-axis.md) | Uniqueness scoring primitive (sport package) |
| [lineup-tie-breaker.md](platform/lineup-tie-breaker.md) | Tie-break prediction spec |
| [referral-network.md](platform/referral-network.md) | On-chain referral policy |
| [brand.md](platform/brand.md) | Naming and wordmark conventions |

## Operations (cross-sport)

| Doc | Purpose |
|-----|---------|
| [cron-pi.md](operations/cron-pi.md) | Raspberry Pi cron host (Tailscale, deploy, PM2) |
| [email-program.md](operations/email-program.md) | Email cadence and audiences |
| [email-implementation.md](operations/email-implementation.md) | MailerSend engineering companion |

## Competitions

| Doc | Purpose |
|-----|---------|
| [fit-guide.md](competitions/fit-guide.md) | Evaluate whether a format fits the platform |
| [shape-ideas.md](competitions/shape-ideas.md) | Brainstorm domains (not a roadmap) |

**Adding a sport:** [`spec/platform/add-sport-checklist.md`](../spec/platform/add-sport-checklist.md)

## Sports

### Golf (`pga-golf`)

| Doc | Purpose |
|-----|---------|
| [event-activation-runbook.md](sports/golf/event-activation-runbook.md) | Activate a PGA tournament week |
| [side-bet-odds-methodology.md](sports/golf/side-bet-odds-methodology.md) | Side-bet pricing math |
| [side-bet-production-plan.md](sports/golf/side-bet-production-plan.md) | Side-bet ops and settlement |

### F1 (`f1`)

| Doc | Purpose |
|-----|---------|
| [event-activation-runbook.md](sports/f1/event-activation-runbook.md) | Activate a Grand Prix race |
| [competition-brief.md](sports/f1/competition-brief.md) | v1 product spec |
| [data-sources.md](sports/f1/data-sources.md) | OpenF1 + Jolpica mapping |

## Internal

| Doc | Purpose |
|-----|---------|
| [economics-sketch.md](internal/economics-sketch.md) | Fee revenue model |
| [product-growth-funnel.md](internal/product-growth-funnel.md) | AARRR funnel definitions |
| [navigation-ia-discussion.md](internal/navigation-ia-discussion.md) | Multi-sport nav draft |
