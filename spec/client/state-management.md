# Client state management (v4)

Three state domains: **server cache** (React Query), **session** (Context), **chain** (Wagmi).

---

## Server state — React Query

**Single `queryClient`** in `lib/queryClient.ts`, provided at app root.

### Patterns

| Pattern | Usage |
|---------|-------|
| `useQuery` | Reads — events, lineups, contests, side bets |
| `useMutation` | Writes — lineup save, profile update |
| `invalidateQueries` | After mutations that affect related reads |
| `enabled` | Gate queries until `eventId` / `userId` / `sportId` known |

### Stale / refetch defaults

| Query | staleTime | refetchInterval |
|-------|-----------|-----------------|
| Sports list | 24h | — |
| Active event | 5m | 5m |
| Candidates | 5m | 5m |
| Contest lobby (`byLobbyRoute`) | 5m while ACTIVE/LOCKED; Infinity otherwise | 5m while ACTIVE/LOCKED |
| Contest timeline | 5m while ACTIVE/LOCKED; Infinity when finished/terminal | 5m while ACTIVE/LOCKED; full then `?since=` merge |
| Contest directory | 15m | — (focus refetch when stale) |
| Side bet market | 0 | 60s |

Global defaults in `queryClient.ts` apply where hooks do not override.

### User-scoped keys

Lineup keys include `userId` so switching accounts does not leak cached rosters:

```typescript
lineups.byEvent(userId, eventId)
```

---

## Session state — Context

### AuthContext

| State | Source |
|-------|--------|
| `user` | `GET /auth/me` |
| `isAuthenticated` | Privy `authenticated` |
| `tokenBalances` | wagmi `useReadContracts` + poll |
| `authFlow` | connect / network selection UI state |
| `startAuthFlow` | imperative connect helper |

Registers Privy token getter with `apiClient` on mount.

### EventScopeContext (contest lobby only)

| State | Source |
|-------|--------|
| `sportId`, `eventId`, `metadata`, `status`, `candidates` | `ContestEventScopeProvider` → `useContestEvent(contest)` |

Used on `/contest/:address` so deep lobby trees (`ContestEntryList`, lineup mutations, plugin hooks) share one contest-scoped event. **Not** app-wide; leaderboard uses `useSportActiveEvent(sportId)` from the URL directly.

### GlobalErrorContext

App-level error message queue for non-field errors (failed loads, unexpected API failures).

---

## Sport scope (no global context)

`sportId` is explicit per surface:

| Surface | Source |
|---------|--------|
| `/sports/:sportId/*` | `useParams().sportId` |
| Contest lobby | `contest.event.sportId` via `ContestEventScopeProvider` |
| Create-contest forms | First enabled sport from `GET /sports` (local form state) |
| Plugin hooks | `useSportUIPlugin(sportId?)` — explicit arg or `EventScopeContext` |

There is no `SportProvider` and no default sport constant.

---

## Chain state — Wagmi

| Concern | Hooks |
|---------|-------|
| Account / chain | `useAccount`, `useChainId` |
| Contract reads | `useReadContract`, `useReadContracts` |
| Writes | `useWriteContract` wrapped in `useBlockchainTransaction` |
| Contest ops | `useContestantOperations` |
| Token buy/sell | `useTokenOperations` |

Wagmi config in `wagmi.ts` — chains: Base (8453), Base Sepolia (84532).

Privy `SmartWalletsProvider` supplies paymaster for sponsored txs where configured.

---

## Local component state

| Use case | Tool |
|----------|------|
| Modal open/close | `useState` |
| Form drafts | `react-hook-form` |
| Optimistic UI | mutation `onMutate` (selective) |

Prefer server cache over duplicating API data in local state.

---

## What is NOT in global state

- Contest list for an event — always React Query
- Candidate pool — React Query, keyed by `(sportId, eventId)`
- Lineup picks during edit — local form state until save
- Contract entry state — Wagmi reads at lobby time
- Active event for a sport — React Query per `sportId`; not a global hook

---

## Invalidation map

| Mutation | Invalidate / patch |
|----------|--------------------|
| Save lineup | `lineups.byEvent`, `sideBet.market`, sometimes `auth/me` lineups |
| Join/leave contest | Optimistic patch `contests.byLobbyRoute` + directory caches; then invalidate `contests.all`, `lineups.all`, `user.contests` |
| Update profile | `auth` user query |
| Place side bet | `sideBet.tickets`, `sideBet.market` |

Centralized in mutation hooks (`useLineupMutations`, `useContestMutations`, etc.).

---

## DevTools

`ReactQueryDevtools` mounted in development only (`App.tsx`).

---

## Naming

Production hooks and query keys use `eventId`. Some server admin APIs still accept `tournamentId` as an alias for `eventId`.
