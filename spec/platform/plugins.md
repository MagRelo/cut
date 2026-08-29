# Plugin system

Shared contracts live in `packages/sport-sdk`. Server and client each maintain a **registry** that maps `sportId` → plugin implementation.

---

## Import boundary (server)

Platform paths must not import sport packages (`@cut/sport-pga-golf`, `@cut/sport-f1`, `@cut/sport-commodities`). They may import `@cut/sport-sdk` and call registries.

| Allowed | Forbidden |
|---------|-----------|
| `server/src/sports/**` (IO + boot registries) | `server/src/services/**` |
| `packages/sport-*` | `server/src/lib/**` |
| `client/src/sports/**` | `server/src/utils/**` |
| `server/src/scripts/**` (ops scripts) | `server/src/routes/**`, `server/src/cron/**` |

Guard: `pnpm run check:sport-boundary`

Platform code dispatches via `requireSportModule` / `getSportEmailContent` / `eventStatusFromMetadata(metadata, sportId)`.

---

## SportModule (server)

**Interface:** `packages/sport-sdk/src/sport-module.ts`  
**Registry:** `server/src/sports/registry.ts` — `getSportModule(sportId)` and `requireSportModule(sportId)`

```typescript
interface SportModule {
  readonly id: string;

  // Event lifecycle
  initEvent(externalId: string): Promise<void>;
  syncEventMetadata(eventId: string): Promise<void>;
  syncParticipantField(eventId: string): Promise<void>;
  syncLiveScores(eventId: string): Promise<void>;
  shouldSyncLiveScores(eventId: string): Promise<boolean>;
  getEventStatus(eventId: string): Promise<"SCHEDULED" | "LIVE" | "COMPLETE">;
  handleWithdrawals?(eventId: string): Promise<void>;

  // Rosters & scoring
  getCandidatePool(eventId: string): Promise<Candidate[]>;
  validateRoster(eventId, picks, rules): Promise<ValidationResult>;
  aggregateLineupScore(eventId, eventParticipantIds): Promise<number>;
  rankEntries(entries): RankedEntry[];

  // Contest lifecycle gates
  shouldActivateContest(eventStatus): boolean;
  shouldSettleContest(eventStatus): boolean;
  derivePayoutVector?(ranked, entryCount): PayoutVector;

  // Optional post-score hook (must stay fast — no LLM)
  afterLiveScoreSync?(eventId: string): Promise<void>;
}
```

### Golf implementation

| Layer | Location |
|-------|----------|
| Pure logic | `packages/sport-pga-golf/` — ranking, validation, status, candidates, **live score transform** |
| Factory | `createPgaGolfModule(handlers)` in `create-module.ts` |
| IO handlers | `server/src/sports/pga-golf/handlers.ts` — Prisma, PGA APIs, DataGolf |
| CLI | `pnpm run service:init-event pga-golf R2026033` |

Handlers inject all database and external API access so the package stays testable.

### How the platform uses SportModule

| Call site | Usage |
|-----------|--------|
| `GET /sports/:sportId/events/:eventId/candidates` | `getCandidatePool` |
| `POST /api/lineups/:eventId` | `validateRoster` |
| `runSportEventPipeline` | sync hooks + live scores + optional `afterLiveScoreSync` |
| `updateContestLineupsForEvent` | Loads per-pick totals, applies platform popularity when `ScoringRules.popularity.weight ≠ 0`, writes `Contest.pickPopularity` + lineup `baseScore` / `popularityBonus` / `score`; then `rankEntries` |
| `settleContest` | `rankEntries`, `derivePayoutVector` |
| `batchActivateContests` / `batchSettleContests` | `shouldActivateContest`, `shouldSettleContest` via event status |

---

## SportUIPlugin (client)

**Interface:** `packages/sport-sdk/src/sport-ui-plugin.ts`  
**Registry:** `client/src/sports/registry.ts`

```typescript
interface SportUIPlugin {
  CandidateRow: React.FC<CandidateRowProps>;       // picker (scheduled card; live delegates to ParticipantRow)
  ParticipantRow: React.FC<ParticipantRowProps>;   // field / event lists (leaderboard, picker live row) — no contest popularity
  ParticipantDetail: React.FC<ParticipantDetailProps>; // detail modal (scorecard header + round tabs + hole table)
  PredictionField?: React.FC<PredictionFieldProps>;
  EventSummary?: React.FC<{ event: CompetitionEventShell }>;
  candidateSortConfig: CandidateSortConfig;        // per-context sort key order for platform lists
}
```

Contest lineup slots use platform `SportLineupPickRow` (wraps `ParticipantRow` plus optional post-lock popularity bonus). See [consensus-axis.md](../../docs/platform/consensus-axis.md).

**Candidate sort contexts** (`@cut/sport-sdk` `sortCandidates`):

| Context | Used by | Status handling |
|---------|---------|-----------------|
| `picker` | `CandidatePicker` | Static key order (e.g. golf: OWGR → DataGolf → name) |
| `fieldLeaderboard` | `EventLeaderboardPanel` | `scheduled` vs `active` key lists |
| `lineupPicks` | Lineup cards, contest entry list/modal | `scheduled` (name) vs `active` (contest `total` descending) |

Sport packages populate `Candidate.sortKeys` in `build*Candidates`. Lineup-pick candidates from `candidateFromLineupPick` start with empty `sortKeys`; `CandidateSortConfig.buildSortKeys` fills them from nested pick metadata before sorting. Export `*CandidateSortConfig` from the sport package and attach to the UI plugin. Platform surfaces call `useCandidateSort(sportId)` → `sort(candidates, context, eventStatus?)`.

`ParticipantRowProps`: `{ candidate, status: EventStatus, onClick?, ownershipPercentage?, eventMetadata? }`. Platform passes `status` from the parent event hook; golf reads `roundDisplay` from `eventMetadata` internally.

`ParticipantDetailProps`: `{ candidate, status: EventStatus, rowTrailing?, onShare?, eventMetadata? }`. Round tab state is owned by the plugin; [`SportParticipantDetailModal`](../../client/src/components/platform/SportParticipantDetailModal.tsx) provides dialog chrome and share URL handling.

Golf also provides `EventDetails` (hero text) used inside `EventSummary`.

### Platform shell (sport-agnostic)

| Component | Role |
|-----------|------|
| `SportEventHeader` | Leaderboard event hero → plugin `EventSummary` (`sportId` prop) |
| `CandidatePicker` | Search/sort over `Candidate[]` |
| `SportLineupPickRow` | Thin wrapper → `SportParticipantRow` in editable lineup slots |
| `SportParticipantRow` | Resolves plugin `ParticipantRow`; passes `status` + optional `eventMetadata` |
| `SportParticipantDetailModal` | Dialog chrome → plugin `ParticipantDetail`; share URL helper |
| `SportPredictionField` | Renders plugin `PredictionField` |
| `CreateContestEventPicker` | Sport + active event for contest create |

Contest lobby renders plugin `EventSummary` in `ContestLobbyView` (not in `AppLayout`).

`useSportUIPlugin(sportId?)` resolves the plugin from an explicit argument or `ContestEventScopeProvider`.

**Client detail:** [sport-ui-plugins.md](../client/sport-ui-plugins.md) — slot purposes, usage map, conventions.

---

## SportEmailContent (server, optional per sport)

**Interface:** `packages/sport-sdk/src/sport-email-content.ts`  
**Registry:** `server/src/sports/emailContentRegistry.ts`

```typescript
interface SportEmailContent {
  readonly sportId: string;
  formatEventSubtitle(input): string;
  loadAnnouncementContent(event): Promise<EmailAnnouncementContent>;
  welcomeProductBlurb?(ctx: { eventName?: string }): string | null;
}
```

Platform owns MailerSend transport, unsubscribe, audience, and blast scripts. Sports own announcement sections, event subtitle formatting, and welcome product copy. `getActiveEventId(sportId)` requires an explicit sport — no PGA default.

---

## Shared types (`@cut/sport-sdk`)

Key exports from `packages/sport-sdk/src/types.ts`:

| Type | Purpose |
|------|---------|
| `Candidate` | Lineup picker row (`eventParticipantId`, `displayName`, `sortKeys`, `metadata`) |
| `RosterRules` | `slotCount`, `minPicks`, `maxPicks`, `allowDuplicates` |
| `RankedEntry` | Contest ranking output |
| `PayoutVector` | Basis points per winner |

Client re-exports types from `client/src/sports/types.ts`.

---

## Drop a sport

1. Disable or remove the `Sport` seed row.
2. Unregister from `server/src/sports/registry.ts`, `emailContentRegistry.ts`, `eventStatusRegistry.ts`, and `client/src/sports/registry.ts`.
3. Delete `packages/sport-<id>/` and `server/src/sports/<id>/` (and `client/src/sports/<id>/`).
4. Contests, wallets, and email **transport** stay unchanged.

Confirm with `pnpm run check:sport-boundary` after removal.

---

## Planned: package-owned ingress

Today sync and external API clients live in `server/src/sports/<id>/` with handler injection into `create*Module`. The target is package-owned sync via a `SportEventRepository` adapter — see [sport-package-ingress.md](sport-package-ingress.md).
