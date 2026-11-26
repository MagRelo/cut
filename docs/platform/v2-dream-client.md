# V2 dream client

Greenfield target for a new `client/` folder. Same product, same APIs, same chain. Not a rewrite schedule and not the as-built tree (`spec/client/`). Product model: [architecture.md](architecture.md).

The web app is a **Privy smart-wallet shell** over the event, contest, lineup, and league APIs. Identity, money, and contest lifecycle are already the right shape. A new client is fast because it has one place for each of those — not because it adds a new stack.

---

## One rule

**A product noun has one module. A user action has one verb. Sport is a plugin slot. Chrome does not know a sport.**

That rule is the architecture. Folder layout, query keys, chain writes, and UI primitives are the same idea applied four times.

---

## What the client is

Eight jobs. Nothing else ships in `client/`.

| Job | Surfaces | Notes |
| --- | --- | --- |
| **Session** | `/connect`, `/onboarding` | Privy email OTP → Kernel smart wallet → `GET /auth/me`. The only web login. |
| **Directory** | `/contests` | Public + member league contests, grouped by event. Default home. |
| **Lobby** | `/contest/:key` | Lineups, contest, winner pool (buy/sell), feed, results. Lineup builder lives here. |
| **Create** | `/contests/create`, `/leagues/:id/contests/create` | One settings model, two layouts (public vs league defaults). |
| **Leagues** | `/leagues`, `/leagues/:id`, join-by-code | Cross-sport groups. Sport is a badge on each contest. |
| **Account** | `/account/funds`, `/activity`, `/referrals`, `/agents`, `/settings` | Wallet send/receive, history, referral tree, agents, display settings. |
| **Field** | `/sports/:sportId/events/:eventId/leaderboard` | Share URL for a participant. Not a hub. |
| **Admin** | `/admin/*` | Staff. Same primitives, same APIs, gated. |

Legal, FAQ, and agent docs are content routes in the same shell. Debug and icon previews are `import.meta.env.DEV` only.

`$0` contests skip the chain. Paid contests deploy and enter through `ContestFactory` / `ContestController`. Scores arrive on the five-minute cron poll. Commentary is Stream Feeds (`contest` feed, id = contest UUID). Agents do not log in on the web; a human enables a P-256 delegate from Settings.

---

## Folder

```
client/src/
  app/           providers, router, gates, shell, one nav list
  screens/       one file per route — bind URL, pick a feature
  features/
    contests/    directory, lobby, create, pool, payouts, timeline
    lineups/     one slot editor (guest save = sign-in; member save = PUT)
    leagues/     list, detail, invite, members  (HTTP may stay /userGroups)
    account/     wallet, activity, settings, referrals, agent
    admin/
    feed/        Stream Feeds — contest commentary (`contest` feed, id = contest UUID)
  platform/      event header, candidate picker, lineup row shells
  sports/        registry.ts + pga-golf | f1 | commodities  (plugin slots only)
  ui/            Button, TextField, Modal, Tabs, ListHeader, PageSection, StatusDot
  data/          apiClient, queryKeys, one file per noun
  chain/         wagmi, addresses, money, escrow, transaction, the verbs
  session/       Privy adapter over the profile query
```

No flat `hooks/`, `utils/`, or `lib/` catch-all. Pure helpers sit next to the noun they serve. Screens do not `fetch` or import ABIs. `sports/<id>` does not import `apiClient` or wagmi. Platform never imports `@cut/sport-pga-golf` (enforced by `check:sport-boundary`).

Client language is **league**, **contest**, **lineup**, **event**, **sport**. The HTTP path `/userGroups` is an implementation detail inside `data/leagues.ts`.

---

## Three states

| State | Owner | Examples |
| --- | --- | --- |
| Server | React Query in `data/` | sports, directory, lobby, timeline, lineups, leagues, profile, referrals, activity |
| Session | `session/` | Privy flag, `AuthUser`, onboarding, odds format |
| Chain | `chain/` | USDC balance, `ContestController.state()`, pool buy/sell quotes, factory receipts |

UI state (slot draft, modal, tab) dies with the screen. There is no global store and no fourth context. Event scope is a lobby provider, not an app-wide sport.

**Live poll** (`SERVER_SYNC_INTERVAL_MS`) only while a contest is `ACTIVE` or `LOCKED` and its event is not `COMPLETE`. Directory keeps previous data and does not interval. Profile is a session query. One `useBalance` for the smart-wallet address; nav, wallet, and join-funds all read it.

---

## Verbs

Feature UI never talks to an ABI. Paid vs `$0` is one branch inside the verb (`hasOnchainEscrow`). Winner pool is a pair: **buy** and **sell** of ERC-1155 shares on an entry. One pool panel, not a buy form plus a separate withdraw list. The controller gates when each call is live (`addSecondaryPosition` / `removeSecondaryPosition`).

| Verb | Chain | Then |
| --- | --- | --- |
| `createContest` | factory `createContest` when paid | `POST /contests` |
| `joinContest` | `approve` + `addPrimaryPosition` when paid | `POST /contests/:id/lineups` |
| `leaveContest` | `removePrimaryPosition` when paid | `DELETE` |
| `saveLineup` | — | `PUT /lineups/:id` (clone-on-reuse is the server) |
| `buyPool` | `approve` + `addSecondaryPosition` | `POST .../secondary-participants` |
| `sellPool` | `removeSecondaryPosition` | indexed payment record |
| `sendUsdc` | token `transfer` | indexed payment record |

`enableDelegate` (ZeroDev session key + `POST /bot/delegates`) lives in `features/account`. Settled secondary payout is `claimSecondaryPayout` from the results panel — not a sell.

Sequence is always: receipt → API → invalidate the keys that verb owns. Optimistic join/leave patches lobby + directory. Pool buy/sell invalidate lobby + on-chain pool reads. `permissionless` is not a dependency; batching is Privy `sendTransaction({ calls })`.

---

## Sport

Platform owns directory, lobby tabs, lineup save/join, create, leagues, wallet, referrals, ranking display.

A sport registers a `SportUIPlugin`: candidate row, participant row, detail, event summary, hero image, status/start/end, sort config. Roster size and prediction slider come from `GET /sports` (`rosterRules`, `predictionRules`) — not from the plugin and not from a golf default.

Adding a sport is: package + registry entry. No `case` in `app/`, `features/`, or `platform/`. Shell copy names Play The Cut, not a tour.

---

## UI

Slate canvas, white paper, Outfit headings, Inter body, solid `blue-500` actions, emerald only as a money numeral. Status is a completed CTA or a live/open dot — not a tinted banner.

Six primitives. One `Modal`. One `Tabs` (lobby, wallet, admin, league). Focus rings live on primitives; the document does not suppress `:focus-visible`. Forms are local state plus a tested `validateX` — no form library.

---

## Stack

Keep: React 19, Vite, TypeScript, React Router 7, TanStack Query, Privy + smart wallets + wagmi/viem, Tailwind 3, Headless UI, Heroicons, `@cut/sport-sdk` + sport packages, Stream Feeds (`@stream-io/feeds-react-sdk` — that is `features/feed`), PostHog (prod), Vitest for pure decisions, Storybook for primitives + one lobby fixture per sport.

Do not add: Zustand, Redux, toasts, Radix, shadcn, `cva`, react-hook-form, Zod on the client, `permissionless`, Stream Chat (`stream-chat`, `@stream-io/stream-chat-css` — unused; commentary is Feeds, not Chat). Response types for contest, profile, and league come from the server (shared module or generated); the client does not invent a `User` with password fields.

---

## Out of scope

Server cron, sport ingestion, settlement, and the database stay as [architecture.md](architecture.md) describes them. Contracts stay sport-agnostic. This folder assumes `GET /sports` carries roster/prediction/period rules, lobby/directory/lineup/league endpoints stay as they are, and live scores are polled, not pushed.
