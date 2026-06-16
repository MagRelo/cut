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
| `prefetchQuery` | App boot active event |
| `invalidateQueries` | After mutations that affect related reads |
| `enabled` | Gate queries until `eventId` / `userId` known |

### Stale / refetch defaults

| Query | staleTime | refetchInterval |
|-------|-----------|-----------------|
| Sports list | 24h | — |
| Active event | 5m | 5m |
| Candidates | 5m | 5m |
| Contests | hook-specific | often on focus |

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

### SportContext

| State | Source |
|-------|--------|
| `sportId` | URL param or path parse; default `pga-golf` |

Read-only for the route tree. Changing sport = navigation via `SportPicker`.

### GlobalErrorContext

App-level error message queue for non-field errors (failed loads, unexpected API failures).

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
- Candidate pool — React Query, keyed by event
- Lineup picks during edit — local form state until save
- Contract entry state — Wagmi reads at lobby time

---

## Invalidation map

| Mutation | Invalidate |
|----------|------------|
| Save lineup | `lineups.byEvent`, `sideBet.market`, sometimes `auth/me` lineups |
| Join/leave contest | `contests.byId`, `contests.byEvent`, lobby route key |
| Update profile | `auth` user query |
| Place side bet | `sideBet.tickets`, `sideBet.market` |

Centralized in mutation hooks (`useLineupMutations`, `useContestMutations`, etc.).

---

## DevTools

`ReactQueryDevtools` mounted in development only (`App.tsx`).

---

## Naming

Production hooks and query keys use `eventId`. Some server admin APIs still accept `tournamentId` as an alias for `eventId`.
