# Client architecture (v4)

---

## Provider stack

```mermaid
graph TB
  PRIVY[PrivyProvider] --> SW[SmartWalletsProvider]
  SW --> RQ[QueryClientProvider]
  RQ --> WAGMI[WagmiProvider]
  WAGMI --> ERR[GlobalErrorProvider]
  ERR --> AUTH[AuthProvider]
  AUTH --> ROUTER[BrowserRouter]
  ROUTER --> APP[AppShell / Routes]
```

| Provider | Role |
|----------|------|
| `PrivyProvider` | Login, embedded wallet, `getAccessToken` |
| `SmartWalletsProvider` | Paymaster config for gas sponsorship |
| `QueryClientProvider` | Server state cache |
| `WagmiProvider` | Contract reads/writes on Base / Base Sepolia |
| `GlobalErrorProvider` | App-wide error surfacing |
| `AuthProvider` | Cut user from `/auth/me`, balances, connect flow |

Event and sport scope are provided at **page boundaries** — `ContestEventScopeProvider` on contest lobby; leaderboard takes `sportId` and `eventId` from the URL (no scope provider).

---

## Routing model

```mermaid
flowchart LR
  ROOT["/"] --> CONTESTS["/contests"]
  LOBBY["/contest/:address"] --> CONTEST[Contest lobby + Lineups tab]
  LEAGUES["/leagues/:id"] --> LEAGUE[League + cross-event contests]
  FIELD["/sports/:sportId/events/:eventId/leaderboard"] --> BOARD[Event field]
```

- **Default home** (`/contests`) — multi-sport live contests hub.
- **Contest lobby** is keyed by **contract address**; lineups are managed on the lobby **Lineups** tab (no `/lineups` route).
- **Leagues** are sport-agnostic; each contest carries `eventId` → sport via server.
- Legacy `/user-groups/*`, `/sports/:sportId`, `/sports/:sportId/leaderboard`, and `/sports/:sportId/contests/:id` redirect to canonical paths.

---

## Sport and event scope

**Sport** — explicit at route boundary:

- `/sports/:sportId/events/:eventId/*` → `useParams().sportId`
- `/contest/:address` → `contest.event.sportId` via `ContestEventScopeProvider`
- Create-contest forms → first upcoming/live directory event’s sport, else user selection (local form state)

**Event** — URL `eventId`, directory group, or `useContestEvent(contest)`; staff create uses `useActiveEventQuery` after sport selection. See [README](README.md).

Plugin hooks (`useSportUIPlugin`) resolve `sportId` from an explicit argument or `EventScopeContext`.

---

## Plugin boundary

```mermaid
flowchart TB
  subgraph platform[Platform shell]
    Header[SportEventHeader]
    Picker[CandidatePicker]
    Pred[SportPredictionField]
  end
  subgraph plugin[SportUIPlugin]
  Golf[pga-golf: CandidateRow, ParticipantRow, ParticipantDetail, EventSummary, PredictionField]
  end
  Header --> plugin
  Picker --> plugin
  Pred --> plugin
```

`client/src/sports/registry.ts` maps `sportId` → `SportUIPlugin`. Platform components call `requireSportUIPlugin(sportId)` for sport-specific rendering (row layout, scorecard, prediction input).

**pga-golf**, **f1**, and **commodities** are registered today. Adding a sport = new package folder + registry entry (server plugin must exist first).

---

## Data layers

| Layer | Tool | Examples |
|-------|------|----------|
| Server state | React Query | events, lineups, contests |
| Auth state | Context | user, balances, `startAuthFlow` |
| Chain state | Wagmi | contest contract, token balances |
| Local UI | useState | modals, form drafts |

See [data-flow.md](data-flow.md) and [state-management.md](state-management.md).

---

## Type system

All production UI uses platform types:

| Type | Source | Used for |
|------|--------|----------|
| `Candidate` | `@cut/sport-sdk` | Picker, rows, detail modal |
| `ActiveEventResponse` | `types/event.ts` | Event metadata + status |
| `PlatformLineup` | `types/event.ts` | User lineups (`picks`, `score`) |
| `ContestLineup` | `types/lineup.ts` | Contest entries (`score`, `position`) |

Golf scorecard shapes (`RoundData`, `TournamentPlayerData`) live in `sports/pga-golf/types.ts` — plugin-internal only.

Some query keys and admin types still expose `tournamentId` aliases; new code should use `eventId`.

---

## Loading gate

`useAppLoadingGate` + `GlobalLoadingOverlay` block the shell until Privy auth settles, reducing flash of empty state on first paint.

`OnboardingRedirectGate` sends new users through `/onboarding` when settings indicate incomplete onboarding.

---

## Security

- API: short-lived Privy bearer tokens via `registerAuthTokenHandlers` in `AuthProvider`
- Routes: `ProtectedRoute` for authenticated pages; `AdminRoute` for staff
- Forms: client-side Yup/Zod; server is authoritative
- No secrets in client bundle beyond public Privy app id and RPC URLs

---

## Performance defaults

| Data | staleTime / poll |
|------|------------------|
| Sports list | 24h |
| Active event | 5 min + refetch on focus |
| Candidates | 5 min |
| Token balances | ~30s poll in AuthContext |

Route-based code splitting is available; heavy admin/debug pages are natural lazy-load candidates.
