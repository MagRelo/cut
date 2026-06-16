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
| Platform data | `useActiveEvent`, `Candidate`, `PlatformLineup` — no legacy tournament bridge |

---

## Directory map

```
client/src/
  pages/              Route-level screens
  components/
    platform/         Sport-agnostic lineup/event UI shells
    sport/            SportPicker (unused in header; inline on create forms)
    contest/          Contest list, cards, lobby, create forms
    lineup/           Lineup cards, side bets, prediction slider
    userGroup/        League UI
    common/           Nav, ProtectedRoute, CountdownTimer, modals
  sports/
    registry.ts       SportUIPlugin map
    pga-golf/         Golf plugin slots + scorecard/, types, utils
  hooks/
    useActiveEvent.ts Primary event + candidates hook
    useSportData.ts   GET /sports, active event, candidates queries
    useLineupQueries.ts    GET/POST /lineups/:eventId
    useContestQuery.ts     Contest fetch by id/address
  contexts/
    AuthContext.tsx   Privy session, /auth/me, token balances
    SportContext.tsx  sportId from URL
  lib/
    candidateUtils.ts   lineup picks → Candidate[]
    lineupScore.ts      display score from API
    lineupApi.ts        Lineup POST helpers
    navTabs.ts          Primary nav (Live Contests → /contests)
  types/
    event.ts          PlatformLineup, ActiveEventResponse
    lineup.ts         ContestLineup, PlatformLineupListItem
  utils/
    apiClient.ts        Bearer auth, X-Cut-Chain-Id
    queryKeys.ts        Centralized React Query keys
```

---

## Key pages

| Route | Page | Notes |
|-------|------|-------|
| `/` | redirect | → `/contests` |
| `/contests` | `ContestListPage` (`Contests`) | Multi-sport live contests (public + league merge per event) |
| `/sports/:sportId` | `SportHubPage` | Single-sport contest list (deep links) |
| `/sports/:sportId/leaderboard` | `LeaderboardPage` | Sport-scoped field leaderboard (share links) |
| `/contest/:address` | `ContestLobbyPage` | On-chain address in URL; Field tab for event leaderboard |
| `/contests/create` | `ContestCreatePage` | Staff / league admin |
| `/lineups` | `LineupListPage` | User lineups across events |
| `/leaderboard` | `LeaderboardPage` | Legacy golf-default field leaderboard |
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

## Platform / plugin boundary

- **Platform** fetches `Candidate[]` and `PlatformLineup`; passes `Candidate` + `EventStatus` into shell components.
- **Plugin** (`sports/pga-golf/`) owns all golf presentation — rows, scorecard, event hero, prediction field.
- Lineup totals: `ContestLineup.score` and `PlatformLineup.score` from the server ([`lineupScore.ts`](../../client/src/lib/lineupScore.ts)).
- See [sport-ui-plugins.md](sport-ui-plugins.md) for the full contract and remaining platform leaks.

---

## Quick links

- [Architecture](architecture.md)
- [Components](component-structure.md)
- [Data flow](data-flow.md)
- [State management](state-management.md)
- [Plugin system (client)](../platform/plugins.md#sportuiplugin-client)
