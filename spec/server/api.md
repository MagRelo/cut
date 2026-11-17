# Server API reference (v4)

Base URL: `/api` (e.g. `http://localhost:3000/api`)

Signing for agents is in [spec/agent/agents.md](../agent/agents.md). This file is the route list.

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

Player routes accept either a Privy bearer token or an [ERC-8128](https://erc8128.org) HTTP message signature. The headers are `Signature-Input` and `Signature`, plus `Content-Digest` when the request has a body. Sending both credentials is `400`. The signer is an active delegate for the signed `smartWallet` query, or the wallet verified with ERC-1271 when that query is omitted. `user.address` is the wallet. `keyid` is `eip155:<chainId>:0x<signer>` (lowercase address) and its chain must equal `X-Cut-Chain-Id` when that header is present (`8453` or `84532`). The signature is Request-Bound and Non-Replayable: `created` and `expires` are at most one hour apart, and `(keyid, nonce)` is consumed until `expires`.

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
| `/agent` | `agent.ts` |
| `/paymaster` | `paymaster.ts` |

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | none | `{ status, service, gitSha, timestamp }` |

---

## Paymaster (`/api/paymaster`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | none | ERC-7677 paymaster JSON-RPC. Accepts `pm_getPaymasterStubData` and `pm_getPaymasterData`. Privy's dashboard paymaster URL points here. There is no bearer token: Privy posts the user operation from the browser. The server sponsors it only when the chain is Base or Base Sepolia, the EntryPoint is v0.7, the sender is a stored `UserWallet` for that chain, the gas limits are within the server cap, and the Kernel `execute` calldata is on the allowlist. Allowed calls are `createContest` on the contest factory, `approve` of a stored contest and `transfer` on the payment token, the six contest entry and claim functions on a stored contest address, and `installValidations` or `uninstallValidation` on the sender. The server then calls Pimlico with `PIMLICO_SPONSORSHIP_POLICY_ID` and ignores any policy id in the request. Factory `createContest` uses a higher call-gas cap because deploying a contest costs about four million gas. Every other call uses the lower cap. A Pimlico result above the cap for that call is returned as a JSON-RPC error. |

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
| POST | `/onchain-payments` | either | Record a confirmed value transfer. `X-Cut-Chain-Id` required. Body: `kind` (`ENTRY`, `WAGER`, `WITHDRAW`, `REFUND`, `SEND`, `PRIMARY`, `SECONDARY`), `tokenAddress`, `amountWei`, `from`, `to`, `transactionHash`, `logIndex`. `contestId` is required except for `SEND`. Optional `entryId`, `lineupId`. The server loads the receipt and stores the log amount. `ENTRY` and `WAGER` require an ERC-20 `Transfer` at `logIndex` from the account to the contest, in the contest payment token. `REFUND` and `WITHDRAW` require that transfer in the other direction. `SEND` requires a `Transfer` from the account in the platform payment token. `PRIMARY` and `SECONDARY` require `PrimaryPayoutClaimed` or `SecondaryPayoutClaimed` for this account, entry, and amount. |

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

**POST `/`** is two creates. `settings.primaryDeposit` of `0` omits `address` and `transactionHash`. A paid contest requires both. The server loads the factory receipt once, requires a `ContestCreated` log for `address`, and requires that log's `host` to be the authenticated wallet (`403` otherwise). It overwrites `settings.operator` and `settings.paymentTokenAddress` from the clone. One row per chain and contract address; a second registration is `409`. `transactionId` is an alias of `transactionHash` on this route only. A paid contest the server must deploy is `createContest` on `POST /api/bot/actions`, not this route.

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

## Agent (`/api/agent`)

`either`. Briefs for the six agent roles. A delegate sends `smartWallet` in the query. `balanceUsdc` is USDC to two decimals, or `null` when the token read failed. The cursor is an opaque string. The first call, with no cursor, is a baseline: companion `updates` is empty. Send the returned cursor on the next call. An invalid cursor is `400` `"Invalid cursor"`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/account` | either | Wallet, chain, `balanceUsdc`, leagues (`id`, `name`, `role`), `referral` (`code`, `url`, `totalEarned`), `entries` (distinct entered contests keyed by status), `preferences` (`sports`, `maxEntryFee`). |
| PUT | `/preferences` | either | Merge `settings.agent`. Body: `sports` (enabled sport ids) and/or `maxEntryFee` (whole USDC, or `null` to clear). At least one field. Unknown sport id is `400` `"Unknown sport"`. Response `{ preferences }`. |
| GET | `/scout` | either | Visible contests on the signed chain, without the field. `contests` are open, not entered, with a published field, and funded when the balance is known. Each row has `event`, `primaryDeposit`, `rosterSize`, `predictionRange`, `fieldCount`, `alreadyEntered: false`, and `fit` (`league`, `affordable`, `open`, `field-ready`, `within-budget`). `blocked` is the rest with one `reason`: `not-open`, `already-entered`, `field-empty`, or `balance`, plus `primaryDeposit`. A non-empty `preferences.sports` omits other sports. A null balance does not block a paid contest and does not mark it `affordable`. |
| GET | `/contests/:contestId/picks` | either | One visible contest, `rosterSize`, `predictionRange`, the field, the saved `lineup` or `null`, and the `entry` or `null`. `404` `"Contest not found"` when it is missing or not visible. |
| GET | `/companion` | either | Entered contests on this chain. Query `cursor`. `{ cursor, unchanged, updates }`. An update has `standing`, `picks`, `signals` (`standing-changed`, `pick-changed`, `status-changed`, `commentary`, `payout`), `commentary` (`generatedAt`, `overview`, `items`), and `payout`. Feed `items` are those whose `entryIds` include this account's entry. |
| GET | `/tick` | either | One poll. Query `cursor`, the same value as companion. `account.balanceUsdc`, `scout.openAffordable`, companion `updates` and `unchanged`, `leagues.needsContest` (admin leagues whose active event is `SCHEDULED` with no open contest), `leagues.unentered` (`contestId`, `leagueId`, `missingMemberIds`), `leagues.settled` (league contests that became settled since the cursor, with `winnerName` and `winningTotal`), and `referrals.totalEarned` plus `referrals.newMembers`. |
| GET | `/referrals` | either | `code`, `url`, `totalEarned`, `recorded`, `levels`, `earnings` (`contestId`, `amount`, `settledAt`), `recent` (direct invitees, public name, `depth`, `joinedAt`). |
| GET | `/leagues` | either | `{ leagues }`. `id`, `name`, `role`, `memberCount`, `openContests`, `activeContests`, `invite` (`{ code, url }` for an admin with a code, otherwise `null`). |
| GET | `/leagues/:id` | either | Member required. `404` `"League not found"` otherwise. `league`, `members` (`id`, `name`), `contests` with `event`, `primaryDeposit`, `referralNetworkBps`, `entryCount`, `memberCount`, `missingMemberIds` (open contests), and `summary` (`winnerName`, `winningTotal`) or `null`. |

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

A delegate signer must be an active `BotDelegate` whose permission is still installed on the wallet. The wallet signer can list contests and save a lineup with no delegate. Join, leave, and `createContest` for a wallet signer submit only when a server-held delegate (`kind` `cut_bot`) is active. A caller-held delegate (`kind` `external`) submits those actions itself and does not need a Cut Bot key.

A server-held delegate submits the user operation. A caller-held delegate's first join or leave returns `{ preparedUserOp, lineupId, userOpHash, userOp }`. The first `createContest` returns `{ preparedUserOp, userOpHash, userOp }`. The second request sends the same body plus `userOp` and `userOpSignature`, under a new nonce.

`createContest` deploys a paid contest. `settings.primaryDeposit` is whole USDC (`1` is $1) and must be greater than zero. `endDate` is an ISO timestamp or unix milliseconds and is stored as the contest end. `settings.expiryTimestamp` is the on-chain expiry in unix seconds. When it is omitted, the server sets it to the unix seconds of `endDate`. A positive `expiryTimestamp` is stored as sent. Optional `description`, `userGroupId`, and `notifyLeagueMembers`. `referralNetworkBps` and `primaryDepositSecondarySubsidyBps` default to `0`. A league contest requires `userGroupId` and a league admin. Omitting `userGroupId` is staff only. An `AGENT` creating a public contest is `403`. A `$0` contest is `POST /api/contests`, which this action does not deploy. The server builds the factory user operation, then records the contest. A caller-held delegate uses the `preparedUserOp` step above. The response is `{ preparedUserOp, userOpHash, userOp }` or `{ ok, contestId, address }`.

**POST `/delegates` body:** `kind` (`cut_bot` or `external`), `delegateAddress`, `smartWallet`, `approval`, `permissionId` (4-byte hex). `smartWallet` must be the signed-in account's wallet.
