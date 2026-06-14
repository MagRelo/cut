# Client layer overview (v4)

React 19 + TypeScript SPA. Sport-agnostic shell with per-sport UI plugins. Default entry: `/sports/pga-golf`.

---

## Responsibilities

| Area | Implementation |
|------|----------------|
| Routing | React Router 7 — sport hub, contest lobby, leagues, account |
| Server data | TanStack React Query + `apiClient` |
| Auth & wallet | Privy + `@privy-io/wagmi` |
| On-chain | Wagmi/viem — contest join, secondary market, token ops |
| Sport UI | `SportUIPlugin` registry (`pga-golf` only today) |
| Legacy bridge | `golfEventAdapter.ts` + `useActiveTournament` map platform APIs → old `Tournament` types |

---

## Directory map

```
client/src/
  pages/              Route-level screens
  components/
    platform/         Sport-agnostic lineup/event UI
    sport/            SportPicker, shared sport chrome
    contest/          Contest list, cards, create forms
    lineup/           Lineup cards, management
    tournament/       Legacy-named display (fed by adapters)
    userGroup/        League UI
    common/           Nav, ProtectedRoute, modals
  sports/
    registry.ts       SportUIPlugin map
    pga-golf/         Golf-specific rows, summary, prediction field
  hooks/
    useSportData.ts   GET /sports, active event, candidates
    useTournamentData.ts   Bridge → legacy tournament shapes
    useLineupQueries.ts    GET/POST /lineups/:eventId
    useContestQuery.ts     Contest fetch by id/address
  contexts/
    AuthContext.tsx   Privy session, /auth/me, token balances
    SportContext.tsx  sportId from URL
  lib/
    golfEventAdapter.ts   CompetitionEvent → Tournament
    lineupApi.ts          Lineup POST helpers
    navTabs.ts            Primary nav (sport-scoped contests tab)
  utils/
    apiClient.ts        Bearer auth, X-Cut-Chain-Id
    queryKeys.ts        Centralized React Query keys
```

---

## Key pages

| Route | Page | Notes |
|-------|------|-------|
| `/` | redirect | → `/sports/pga-golf` |
| `/sports/:sportId` | `SportHubPage` | Active event contest list |
| `/contest/:address` | `ContestLobbyPage` | On-chain address in URL |
| `/contests/create` | `ContestCreatePage` | Staff / league admin |
| `/lineups` | `LineupListPage` | User lineups across events |
| `/leaderboard` | `LeaderboardPage` | Sport leaderboard |
| `/leagues/*` | User group pages | Canonical league URLs |
| `/user-groups/*` | redirects | → `/leagues/*` |
| `/account/*` | Account, history, funds | |
| `/admin/*` | Admin dashboard | `ADMIN` / `SUPER_ADMIN` |

---

## Dependencies

| Category | Libraries |
|----------|-----------|
| Core | React 19, React Router 7, TypeScript |
| Data | @tanstack/react-query |
| Auth | @privy-io/react-auth, @privy-io/wagmi |
| Chain | wagmi, viem |
| UI | Tailwind, Headless UI, Heroicons, Chart.js |
| Forms | react-hook-form, yup, zod |

---

## Server integration

- Base path: `/api` via `apiClient`
- Auth: `Authorization: Bearer <privy_access_token>`
- Optional: `X-Cut-Chain-Id` for multi-chain wallet resolution
- Live APIs: `/sports`, `/lineups`, `/contests`, `/userGroups`, `/bets`, `/auth`
- Legacy `/tournaments` and `/lineup` return **501** — client must not call them on v4

---

## Transitional bridge (Phase 6–9)

Many components still consume `Tournament` / `PlayerWithTournamentData` types. The bridge:

1. `useActiveEventQuery` / `useEventCandidatesQuery` — platform APIs
2. `golfEventAdapter.ts` — maps to legacy shapes
3. `useActiveTournament` — composed hook used by lineup/contest UI

Phase 10 will remove this bridge once all consumers use `ActiveEventResponse` and `Candidate` directly.

---

## Quick links

- [Architecture](architecture.md)
- [Components](component-structure.md)
- [Data flow](data-flow.md)
- [State management](state-management.md)
- [Plugin system (client)](../platform/plugins.md#sportuiplugin-client)
