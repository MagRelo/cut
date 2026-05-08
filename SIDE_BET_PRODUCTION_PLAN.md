# Side Bet Production Plan

## Scope and Decisions

- Odds source: third-party sportsbook-style API.
- Grading source: same odds provider result/settlement feed.
- Settlement rail: on-chain-like flow (persist transaction/payment artifacts similarly to contests).
- Frontend target: replace mock `SideBetPanel` grid with live market + placement + open/settled state.

## Data Model (Server + Prisma)

- Add side-bet domain models in [server/prisma/schema.prisma](server/prisma/schema.prisma):
  - `SideBetMarket` (tournament/lineup scoped market metadata, provider event IDs, status).
  - `SideBetSelection` (normalized selectable outcomes: `hitsRequired` x `finishThreshold` + provider odds).
  - `SideBetTicket` (user/wallet stake, selected cells, derived aggregate odds, status lifecycle).
  - `SideBetTicketLeg` (optional normalized per-leg storage for auditability and grading).
  - `SideBetSettlement` (provider result payload + settlement metadata + tx hash/reference).
- Keep lifecycle/status enums aligned with existing contest patterns (`OPEN`, `LOCKED`, `SETTLING`, `SETTLED`, `VOID`).
- Add migration and indices for common queries (`tournamentId`, `userId/wallet`, `status`, `createdAt`).

## Odds Ingestion + Round-Robin Pricing

- Implement odds provider client (`server/src/services/odds/providerClient.ts`) with:
  - event lookup by tournament/player mapping,
  - per-player finish markets fetch,
  - normalized decimal/american conversion helpers.
- Implement market builder (`server/src/services/odds/buildSideBetMarket.ts`) to map lineup's 4 golfers into selectable cells (`2/3/4 of 4` x `Top10/20/30`).
- Implement round-robin aggregator (`server/src/services/odds/calculateRoundRobinOdds.ts`):
  - derive combo set for each row (C(4,2), C(4,3), C(4,4)),
  - compute combined odds per combo,
  - average combo implied return (or equivalent decimal averaging rule),
  - convert to final display odds string + stored decimal for settlement math.
- Persist fresh market snapshots and mark stale markets when provider data is unavailable.

## API Surface

- Add route module [server/src/routes/bets.ts](server/src/routes/bets.ts), mounted in [server/src/routes/api.ts](server/src/routes/api.ts).
- Endpoints:
  - `GET /api/bets/side/lineup/:lineupId/market` - latest grid + status + user open tickets.
  - `POST /api/bets/side/tickets` - place ticket (selected cells, stake, wallet/user context).
  - `GET /api/bets/side/tickets` - list user tickets (open/settled).
- Validation:
  - ensure lineup ownership/eligibility,
  - reject locked or stale markets,
  - validate selected cells against current market version,
  - persist quote version/odds at placement for deterministic settlement.

## On-Chain-Like Settlement Flow

- Add batch services mirroring contest phases:
  - `server/src/services/batch/batchLockSideBetMarkets.ts`
  - `server/src/services/batch/batchSettleSideBets.ts`
  - `server/src/services/batch/batchCloseSideBets.ts`
- Add per-ticket settlement service (`server/src/services/betting/settleSideBetTicket.ts`) to:
  - pull provider settlement/result feed,
  - resolve ticket win/loss/void,
  - compute payout from locked-in odds/stake,
  - execute settlement transaction via existing payment abstraction pattern,
  - persist payment artifacts (`txHash`, amount, metadata) in side-bet settlement records (and/or `OnchainPayment` with a new payment type).
- Trigger in scheduler [server/src/cron/scheduler.ts](server/src/cron/scheduler.ts):
  - run odds refresh after tournament update,
  - run lock/settle/close stages alongside existing contest lifecycle with non-overlap safeguards.

## Frontend Integration

- Update [client/src/components/lineup/SideBetPanel.tsx](client/src/components/lineup/SideBetPanel.tsx):
  - convert from internal mock data to props/API-backed state,
  - render provider-backed odds and market lock state,
  - wire CTA to place tickets.
- Pass real data through [client/src/components/lineup/LineupContestCard.tsx](client/src/components/lineup/LineupContestCard.tsx) and lineup page fetch path ([client/src/pages/LineupListPage.tsx](client/src/pages/LineupListPage.tsx), [client/src/hooks/useLineupQueries.ts](client/src/hooks/useLineupQueries.ts)).
- Add typed contracts in [client/src/types/lineup.ts](client/src/types/lineup.ts) (or dedicated bet types file) for market, quote, ticket, and settlement statuses.
- Add React Query hooks for market fetch + ticket placement + optimistic refresh.

## Reliability and Operations

- Add provider failure handling: retry/backoff, stale flags, partial-market suppression.
- Add idempotency keys for placement and settlement jobs.
- Add audit logs around quote generation, placement, and settlement transitions.
- Add feature flag to enable side bets per tournament/contest while rolling out.

## Testing and Verification

- Unit tests:
  - odds conversion + round-robin averaging math,
  - selection validation and payout calculations,
  - status transition guards.
- Integration tests:
  - market fetch/placement endpoints,
  - cron lock/settle jobs against seeded tournament + mocked provider feed,
  - duplicate-settlement and idempotency cases.
- UI tests:
  - panel renders live grid,
  - placement success/failure states,
  - open vs settled ticket display.

## Architecture Flow

```mermaid
flowchart TD
  oddsProvider[OddsProviderAPI] --> oddsIngest[OddsIngestionService]
  oddsIngest --> marketStore[SideBetMarketTables]
  marketStore --> betsApi[SideBetAPI]
  betsApi --> sideBetPanel[SideBetPanelUI]
  sideBetPanel --> placeTicket[PlaceTicketEndpoint]
  placeTicket --> ticketsStore[SideBetTicketTables]
  oddsProvider --> settleFeed[ProviderSettlementFeed]
  settleFeed --> settleJob[BatchSettleSideBetsJob]
  ticketsStore --> settleJob
  settleJob --> chainSettle[OnChainLikeSettlementService]
  chainSettle --> payoutsLedger[SettlementAndPaymentArtifacts]
```

## Implementation Order

1. Prisma models + migration + enums.
2. Odds provider client + market builder + round-robin math service.
3. Side-bet API endpoints + validation + ticket placement persistence.
4. Cron stages for lock/settle/close with provider result feed integration.
5. Frontend wiring in lineup flow and `SideBetPanel`.
6. Tests + staged rollout flag.
