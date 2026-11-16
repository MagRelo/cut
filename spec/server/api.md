# Server API reference (v4)

Base URL: `/api` (e.g. `http://localhost:3000/api`)

Signing for agents is in [client/public/agents.md](../../client/public/agents.md). This file is the route list.

Two ways to write a lineup or a paid contest:

- `/api/lineups` and `/api/contests` record a transaction the wallet already sent.
- `POST /api/bot/actions` is where the server builds and submits the user operation (`lineupUpsert`, `join`, `leave`, `createContest`).

A lineup roster is `candidates` on every request and response. A write is an ordered array of `eventParticipantId` strings. A read is that roster with scores. `GET /api/sports/:sportId/events/:eventId/candidates` is the field pool, a different shape under the same word.

## Authentication

| Value | Meaning |
|-------|---------|
| `none` | No credential. A bearer or signature is optional where the description says so. |
| `either` | Privy bearer or an ERC-8128 signature. One is required. |
| `signature` | ERC-8128 only. |
| `privy` | Privy bearer only. |
| `staff` | Privy bearer and `userType` `ADMIN` or `SUPER_ADMIN`. |

Player routes accept either a Privy bearer token or an [ERC-8128](https://erc8128.org) HTTP message signature. The headers are `Signature-Input` and `Signature`, plus `Content-Digest` when the request has a body. Sending both credentials is `400`. The signer is an active delegate for the signed `smartWallet` query, or the wallet verified with ERC-1271 when that query is omitted. `user.address` is the wallet. `keyid` is `eip8128:<chainId>:0x<signer>` and its chain must equal `X-Cut-Chain-Id` when that header is present (`8453` or `84532`). The signature is Request-Bound and Non-Replayable: `created` and `expires` are at most one hour apart, and `(keyid, nonce)` is consumed until `expires`.

`AGENT` is a player type. It is not staff.

The browser sends:

```
Authorization: Bearer <privy_access_token>
X-Cut-Chain-Id: <8453 or 84532; required on on-chain routes via requireWalletChain>
```

Bearer middleware verifies the Privy JWT and loads the Cut user from Postgres (`User` + primary `UserWallet`). It does not call Privy `users()._get` or write identity rows. Browser signup and wallet sync happen on `POST /auth/session` and `POST /auth/sync-wallets`. An agent account is created on `POST /auth/register`. A later Privy login on that wallet attaches `privyUserId` and leaves `userType` `AGENT`.

**Auth error codes**

| Code | HTTP | Meaning |
|------|------|---------|
| `NEEDS_PROVISIONING` | 401 | Valid JWT, no Cut user — client should `POST /auth/session` |
| `WALLET_NOT_PROVISIONED_FOR_CHAIN` | 409 | User exists, no primary wallet for `X-Cut-Chain-Id` |
| `WALLET_OWNED_BY_OTHER_ACCOUNT` | 409 | Privy-linked address belongs to another user |
| `EMAIL_ALREADY_BOUND` | 400 | Email already linked to another Cut user |

JSON bodies are capped at 128 KiB.

---

## Route index

| Prefix | Router file |
|--------|-------------|
| `/health` | `api.ts` |
| `/auth` | `auth.ts` |
| `/sports` | `sports.ts` |
| `/lineups` | `lineups.ts` |
| `/contests` | `contest.ts` |
| `/userGroups` | `userGroup.ts` |
| `/admin` | `admin.ts` |
| `/cron` | `cron.ts` |
| `/unsubscribe` | `unsubscribe.ts` |
| `/stream` | `stream.ts` |
| `/bot` | `bot.ts` |

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | none | `{ status, service, gitSha, timestamp }` |

---

## Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | signature | Create an agent account. Wallet signer only. Body requires `email`; optional `name`, `referralCode`. New accounts are `userType` `AGENT`. A `smartWallet` query that is not the signer is `403`. Repeating register for the same wallet returns that account and does not change email or type. `201` when created, `200` when the wallet already has an account. Response: `userId`, `email`, `userType`, `name`, `referralCode`, `smartWallet`, `created`. |
| POST | `/session` | privy | Signup / sync from Privy. Optional `X-Cut-Referral-Code` is best-effort. Privy dashboard test accounts are stored as `userType` `TEST`. |
| POST | `/sync-wallets` | privy | Re-sync `UserWallet` rows from Privy linked accounts. |
| GET | `/me` | either | Profile, leagues, and `referralCode`. Mints a code if the user has none. |
| GET | `/referrals/summary` | either | Referral tree summary. |
| PUT | `/update` | either | Display name, 1–80 characters. |
| PUT | `/settings` | either | Merge `color`, `oddsFormat` (`american`, `decimal`, `english`), and `onboardingDismissed`. Does not change `marketingUnsubscribed`. |
| GET | `/contests` | either | This account's contest history. |
| GET | `/transactions` | either | Activity feed: entries, predictions, payouts. |
| POST | `/onchain-payments` | either | Record a confirmed value transfer. `X-Cut-Chain-Id` required. Body: `kind` (`ENTRY`, `WAGER`, `WITHDRAW`, `REFUND`, `SEND`, `PRIMARY`, `SECONDARY`), `tokenAddress`, `amountWei`, `from`, `to`, `transactionHash`, `logIndex`. `contestId` is required except for `SEND`. Optional `entryId`, `lineupId`. |

---

## Sports (`/api/sports`)

Unsigned.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | none | Enabled sports. |
| GET | `/:sportId/events/active` | none | Active event and status. `404` if none. |
| GET | `/:sportId/events/:eventId` | none | One event for that sport. `404` if it is not that sport's event. |
| GET | `/:sportId/events/:eventId/candidates` | none | Field pool: `{ candidates }`. |

Event responses are `{ sport, event, status }`. `event.metadata` is sport JSON (golf: name, dates, course, round status).

---

## Lineups (`/api/lineups`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:eventId` | either | This account's lineups for the event. `{ lineups }`. |
| POST | `/:eventId` | either | Create a lineup. |
| POST | `/clone/:lineupId` | either | Copy a lineup into `contestId`. |
| PUT | `/:lineupId` | either | Update that lineup. |

**POST / PUT body:**

```json
{
  "candidates": ["<eventParticipantId>"],
  "name": "optional",
  "contestId": "optional on create",
  "prediction": { "type": "winningLineupTotal", "value": 142 }
}
```

- `candidates` is an ordered array of `eventParticipantId` values, at most 8.
- `POST` creates a new row. The same roster and prediction in the same contest is rejected when `contestId` is set.
- `PUT` updates candidates, name, and prediction.
- `prediction` is `{ "type": "winningLineupTotal", "value": <int> }` inside the sport's range. Omit it on create and the server stores a sport default.
- `name` is optional, max 80 characters.
- Create and update are rejected after the event is live or complete.
- Clone body is `{ "contestId", "name"? }`.

A lineup read includes `candidates` (id, slot, participant, `scoreData`, `total`) and `score`.

---

## Contests (`/api/contests`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/directory` | none | Cross-event list. Query `scope`: `live`, `past`, or `all` (default). A bearer or signature is optional and includes that account's league contests. |
| GET | `/` | none | Contests for one event. A bearer or signature is optional. |
| GET | `/:id` | none | Lobby payload. `:id` is the contest id or the contract address. |
| GET | `/:id/lobby` | none | Same payload as `GET /:id`, with `Cache-Control: private, max-age=15`. |
| GET | `/:id/timeline` | none | Score timeline. Optional `?since=` ISO timestamp. |
| POST | `/` | either | Create a contest. Staff for a public contest, league admin for a league contest. |
| POST | `/:id/lineups` | either | Join with a lineup. `X-Cut-Chain-Id` when the contest has escrow. |
| DELETE | `/:id/lineups/:lineupId` | either | Leave. `:lineupId` is the contest-lineup id. |
| DELETE | `/:id` | either | Delete an open league contest. League admin. Paid contests that already have entries are rejected. |
| POST | `/:id/secondary-participants` | either | Index a winner-pool buy from a confirmed transaction. `X-Cut-Chain-Id` required. |

**GET `/` query:** `eventId` (required), optional `chainId`, optional `userGroupId` (member required).

League contests are `404` to non-members.

**POST `/`** is two creates. `settings.primaryDeposit` of `0` omits `address` and `transactionHash`. A paid contest requires both. The server loads the factory receipt once, requires a `ContestCreated` log for `address`, and overwrites `settings.operator` and `settings.paymentTokenAddress` from the clone. `transactionId` is an alias of `transactionHash` on this route only. A paid contest the server must deploy is `createContest` on `POST /api/bot/actions`, not this route.

Other body fields: `eventId`, `name`, `endDate`, `chainId`, `settings`, optional `userGroupId`, `description`, `notifyLeagueMembers`. `notifyLeagueMembers` emails opted-in league members after the row is written. It is ignored without `userGroupId`.

**POST `/:id/lineups` body:** `lineupId`. An optional `entryId` is ignored. The server sets `entryId` from the contest address and lineup id. On-chain `entryOwner(entryId)` must be the authenticated wallet.

**POST `/:id/secondary-participants` body:** `entryId`, `transactionHash`, `chainId`, optional `amountWei`. The server requires a `SecondaryPositionAdded` log on this contest for the caller and `entryId`. Replays of the same `transactionHash` are idempotent.

A signed-in lobby may include `contestLineups[].referralStake` (`{ depth }`, 1–10) when that entry owner is in the viewer's invite tree and the contest has a referral-network fee. Unsigned payloads omit it. Open contests omit roster `candidates`.

---

## Leagues (`/api/userGroups`)

The product name is league. The path is `/api/userGroups`. Client pages are `/leagues`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | either | Leagues for the current account. |
| POST | `/` | either | Create a league. The creator is the league admin. |
| POST | `/join` | either | Join with an invite code. |
| GET | `/:id` | either | League detail and members. Member required. |
| PUT | `/:id` | either | Update name and description. League admin. |
| DELETE | `/:id` | either | Delete the league. League admin. |
| GET | `/:id/contests` | either | League contests across events. Member required. |
| GET | `/:id/members` | either | Member list. Member required. |
| DELETE | `/:id/members/:userId` | either | Remove a member. |
| POST | `/:id/invite` | either | Generate an invite code. League admin. |

---

## Admin (`/api/admin`)

`staff`. An agent signature is `403`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dashboard` | staff | Ops dashboard. Query `eventId`. `tournamentId` is accepted as an alias on this route only. |
| POST | `/contests/lock-eligible` | staff | Batch lock contests. |
| POST | `/contests/:contestId/lock` | staff | Lock one active contest. |
| GET | `/users` | staff | User list and payment-token balances. Query `userType`: `USER` (default), `TEST`, `ADMIN`, `SUPER_ADMIN`, `PUBLIC`, `AGENT`. `X-Cut-Chain-Id` required. |
| GET | `/users/:id` | staff | User detail. |
| POST | `/test-email` | staff | Send a preview email. |

---

## Cron (`/api/cron`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/status` | staff | Scheduler enabled and active job names. |

---

## Unsubscribe (`/api/unsubscribe`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | none | Marketing unsubscribe. The link carries its own signed token. |

---

## Stream (`/api/stream`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/token` | either | Stream Feeds user token. `{ apiKey, token, userId, expiresInSeconds }`. `503` when Stream is disabled. |

---

## Bot (`/api/bot`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/delegate-address` | none | Public address of the server-held delegate, or `null` when that key is unset. |
| GET | `/contests` | signature | Contests this signer can enter, each with its field. |
| POST | `/actions` | signature | `lineupUpsert`, `join`, `leave`, or `createContest`. |
| GET | `/delegates` | either | Delegates for the account. |
| POST | `/delegates` | privy | Record an approved session key. |
| POST | `/delegates/revoke` | privy | Mark a delegate revoked. |

**GET `/contests` query:** `chainId` (`8453` or `84532`), `smartWallet`, optional `eventId`. Visibility matches `GET /api/contests`: public contests, plus league contests for that account.

**POST `/actions` lineup body:**

```json
{
  "chainId": 8453,
  "action": "lineupUpsert",
  "smartWallet": "0x…",
  "contestId": "contest id",
  "lineupId": "",
  "candidates": ["eventParticipantId"],
  "prediction": { "type": "winningLineupTotal", "value": 142 }
}
```

`lineupId` `""` creates a lineup. A lineup id updates it. `join` and `leave` send the lineup id and omit `candidates`. `prediction` is optional on `lineupUpsert`.

A delegate signer must be an active `BotDelegate` whose permission is still installed on the wallet. The wallet signer can list contests and save a lineup with no delegate. Join and leave for that wallet submit only when a server-held delegate (`kind` `cut_bot`) is active.

A server-held delegate submits the user operation. A caller-held delegate's first join or leave returns `{ preparedUserOp, lineupId, userOpHash, userOp }`. The second request sends the same body plus `userOp` and `userOpSignature`, under a new nonce.

`createContest` deploys a paid contest. The body includes `name`, `eventId`, `endDate`, and `settings.primaryDeposit` greater than zero, with optional `description`, `userGroupId`, and `notifyLeagueMembers`. The caller must be a league admin or staff. An `AGENT` creating a public contest is rejected. The server builds the factory user operation, then records the contest with the same rules as `POST /api/contests`. A caller-held delegate uses the same `preparedUserOp` step. The response is `{ preparedUserOp, userOpHash, userOp }` or `{ ok, contestId, address }`.

**POST `/delegates` body:** `kind` (`cut_bot` or `external`), `delegateAddress`, `smartWallet`, `approval`, `permissionId` (4-byte hex). `smartWallet` must be the signed-in account's wallet.
