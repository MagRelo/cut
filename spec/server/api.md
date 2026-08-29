# Server API reference (v4)

Base URL: `/api` (e.g. `http://localhost:3000/api`)

## Authentication

Protected routes:

```
Authorization: Bearer <privy_access_token>
X-Cut-Chain-Id: <8453 or 84532; required on on-chain routes via requireWalletChain>
```

Middleware verifies the Privy JWT and loads the Cut user from Postgres (`User` + primary `UserWallet`). It does **not** call Privy `users()._get` or write identity rows. Signup and wallet sync happen only on `POST /auth/session` and `POST /auth/sync-wallets`.

**Auth error codes**

| Code | HTTP | Meaning |
|------|------|---------|
| `NEEDS_PROVISIONING` | 401 | Valid JWT, no Cut user — client should `POST /auth/session` |
| `WALLET_NOT_PROVISIONED_FOR_CHAIN` | 409 | User exists, no primary wallet for `X-Cut-Chain-Id` |
| `WALLET_OWNED_BY_OTHER_ACCOUNT` | 409 | Privy-linked address belongs to another user |
| `EMAIL_ALREADY_BOUND` | 400 | Email already linked to another Cut user (identity conflict; not a referral miss) |

JSON bodies are capped at 128 KiB.

---

## Route index

| Prefix | Router file | Status |
|--------|-------------|--------|
| `/health` | `api.ts` | ✅ |
| `/auth` | `auth.ts` | ✅ |
| `/sports` | `sports.ts` | ✅ |
| `/lineups` | `lineups.ts` | ✅ |
| `/contests` | `contest.ts` | ✅ |
| `/userGroups` | `userGroup.ts` | ✅ |
| `/bets` | `bets.ts` | ✅ (flag) |
| `/admin` | `admin.ts` | ✅ staff |
| `/cron` | `cron.ts` | ✅ |
| `/unsubscribe` | `unsubscribe.ts` | ✅ |
| `/tournaments` | `legacy.ts` | ❌ 501 |
| `/lineup` | `legacy.ts` | ❌ 501 |

---

## Health

### `GET /api/health`
No auth. `{ status, service, timestamp }`

---

## Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | ✅ | User profile + `userGroups` (read-only; no Privy fetch) |
| POST | `/session` | JWT | Signup / sync from Privy. Optional `X-Cut-Referrer-Address` is best-effort: a missing, unknown, or not-yet-on-chain inviter does not fail the request. After a valid Privy JWT, a new Cut user is always created. |
| POST | `/sync-wallets` | ✅ | Re-sync `UserWallet` rows from Privy linked accounts |
| GET | `/referrals/summary` | ✅ | Referral tree summary |
| PUT | `/update` | ✅ | Update display name (1–80 chars) |
| PUT | `/settings` | ✅ | Merge allowlisted settings (`color`, `oddsFormat`). Does not change `marketingUnsubscribed`. |
| GET | `/contests` | ✅ | User's contest history |
| GET | `/transactions` | ✅ | Synthetic activity feed (entries, predictions, side bets, payouts) |

---

## Sports (`/api/sports`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | List enabled sports (`SportSummary[]`) |
| GET | `/:sportId/events/active` | — | Active event + status. 404 if none. |
| GET | `/:sportId/events/:eventId/candidates` | — | `{ candidates: Candidate[] }` |

**Active event response:** `{ sport, event, status }` where `event` is `CompetitionEvent` with `metadata` JSON (golf: name, dates, course, round status, etc.).

---

## Lineups (`/api/lineups`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:eventId` | ✅ | User's lineups for event `{ lineups: [...] }` |
| POST | `/:eventId` | ✅ | **Create** a new lineup |
| POST | `/clone/:lineupId` | ✅ | **Clone** picks/prediction into a new lineup for `contestId` |
| PUT | `/:lineupId` | ✅ | **Update** an existing lineup |

**POST / PUT body:**
```json
{
  "picks": ["<eventParticipantId>", "..."],
  "name": "optional",
  "contestId": "optional on create; required on clone",
  "prediction": { "type": "winningLineupTotal", "value": 142 }
}
```

- `POST` always creates a new row; rejects duplicate roster + prediction **within the same contest** when `contestId` is set
- `PUT` updates picks/name/prediction for the given `lineupId`
- Validates via `SportModule.validateRoster`
- `prediction` must be `{ "type": "winningLineupTotal", "value": <int> }` inside the sport's `predictionRules` min/max. Extra keys are rejected. Omit on create to store a sport default.
- `name` is optional, max 80 characters
- `requireEventEditable` / `requireLineupEditable` — blocked after event is live/complete
- Marks side-bet market stale on save

---

## Contests (`/api/contests`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | optional | List contests for an **event** |
| GET | `/:id` | optional | Contest detail (id or contract address) |
| GET | `/:id/lobby` | optional | Lobby standings/status (no timeline). Signed-in viewers may receive `contestLineups[].referralStake` (`{ depth }`, 1–10) when that entry owner is in their invite tree and the contest has a referral-network fee. Anonymous payloads omit it. |
| GET | `/:id/timeline` | optional | Score timeline; optional `?since=` ISO for deltas |
| POST | `/` | ✅ | Create contest (staff or league admin) |
| POST | `/:id/lineups` | ✅ | Join contest with lineup |
| DELETE | `/:id/lineups` | ✅ | Leave contest |
| POST | `/:id/secondary-participants` | ✅ | Index a secondary (winner-pool) buy from a confirmed tx |

**GET `/` query:**
- `eventId` (required) — was `tournamentId` in legacy
- `chainId` (optional)
- `userGroupId` (optional) — league scope; member required

**POST `/:id/lineups` body:** `lineupId` (optional `entryId` is ignored). The server sets `entryId` to `generateContestEntryId(contest.address, lineupId)` — the same hash the client uses in `addPrimaryPosition`. On-chain `entryOwner(entryId)` must be the authenticated wallet.

**POST `/:id/secondary-participants` body:** `entryId`, `transactionHash`, `chainId`, optional `amountWei`. The server loads the receipt once (no polling), requires a `SecondaryPositionAdded` log on this contest for the caller and `entryId`, and stores that log's `amount`. If `amountWei` is sent it must match. Replays of the same `transactionHash` are idempotent (no second RPC, no double-count).

**POST `/` body:** `eventId`, `name`, `address` (0x), `chainId`, `transactionHash` (factory `createContest` tx; `transactionId` is accepted as an alias), `settings`, optional `userGroupId`, `description`, `endDate`. Settings addresses and bps (0–10000) are validated. The server loads the receipt once (no polling), requires a `ContestCreated` log from the configured ContestFactory for `address`, reads `operator()` / `paymentToken()` on the clone, and overwrites `settings.operator` and `settings.paymentTokenAddress` with those on-chain values. Rejects if the operator or token does not match server config.

League contests return **404** to non-members.

---

## Leagues (`/api/userGroups`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | ✅ | Leagues for current user |
| POST | `/` | ✅ | Create league (creator = ADMIN) |
| POST | `/join` | ✅ | Join via invite code |
| GET | `/:id` | ✅ member | League detail + members |
| PUT | `/:id` | ✅ admin | Update name/description |
| DELETE | `/:id` | ✅ admin | Delete league |
| GET | `/:id/contests` | ✅ member | All league contests across events |
| GET | `/:id/members` | ✅ member | Member list |
| POST | `/:id/members` | ✅ admin | Add member |
| DELETE | `/:id/members/:userId` | ✅ | Remove member |
| POST | `/:id/invite` | ✅ admin | Generate invite code |

Client routes use `/leagues/*`; API path remains `/userGroups` for compatibility.

---

## Side bets (`/api/bets`)

Requires `SIDE_BETS_ENABLED=true`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/side/lineup/:lineupId/market` | ✅ | Market + selections for lineup |
| POST | `/side/tickets` | ✅ | Place ticket |
| GET | `/side/tickets` | ✅ | User's tickets (optional filters) |

**Place ticket body:** `lineupId`, `hitsRequired` (2\|3\|4), `topN` (5\|10\|20), `stakeAmount`, optional `transactionHashes`

Response includes `playerIds` (= `eventParticipantIds`) for client compat.

---

## Admin (`/api/admin`)

Staff only (`requireAdmin`).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard` | Ops dashboard. Query: `eventId` or `tournamentId` alias |
| POST | `/contests/lock-eligible` | Batch lock contests |
| GET | `/users` | User list + on-chain balances. Query `userType`: `USER` (default), `TEST`, `ADMIN`, `SUPER_ADMIN`, `PUBLIC` |
| GET | `/users/:id` | User detail |
| GET | `/bets/side/tournament-report` | Side-bet exposure report |
| POST | `/bets/side/lock` | Lock side-bet markets |
| POST | `/bets/side/settle` | Settle side-bet tickets |
| POST | `/bets/side/close` | Close markets |
| POST | `/test-email` | Send preview email (`mode`: preview kinds) |

---

## Cron (`/api/cron`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/status` | Scheduler enabled + active job names |

---

## Unsubscribe (`/api/unsubscribe`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Marketing unsubscribe (signed token) |

---

## Legacy (501)

`GET|POST|PUT|DELETE /api/tournaments/*` and `/api/lineup/*` return:

```json
{
  "error": "Endpoint unavailable during platform rewrite",
  "message": "Use /api/sports and /api/lineups for the new platform APIs"
}
```

---

## Client mapping

| Client hook / page | API |
|--------------------|-----|
| `useSportsQuery` | `GET /sports` |
| `useActiveEventQuery` | `GET /sports/:sportId/events/active` |
| `useEventCandidatesQuery` | `GET /sports/.../candidates` |
| `useContestsQuery` | `GET /contests?eventId=` |
| `useUserGroupContestsQuery` | `GET /userGroups/:id/contests` |
| Lineup save | `POST /lineups/:eventId` (create) or `PUT /lineups/:lineupId` (update) |
| `useAuth` bootstrap | `GET /auth/me`, then `POST /auth/session` if `NEEDS_PROVISIONING` |
| `useUserTransactions` / Manage Funds → Activity | `GET /auth/transactions` |
