# Server API reference (v4)

Base URL: `/api` (e.g. `http://localhost:3000/api`)

Signing for agents is in [agents.md](agents.md). This file is the route list.

A write is one verb. The body decides the completion. A confirmed transaction is recorded. A signed request with no receipt returns a prepared user operation, and the second call sends `userOp` and `authorizationSignature`.

- Lineup create and update are `/api/lineups`. Those writes do not build a user operation.
- Join, leave, contest create, and USDC send that move funds return a prepared user operation. A bearer request that already has a receipt records the row. A signature prepares the user operation, and the second call sends `authorizationSignature`.

A lineup roster is `candidates` on every lineup request and response. A write is an ordered array of `eventParticipantId` strings. A read is that roster with scores. `GET /api/events/:eventId/field` is the field pool, a different shape under the same word.

## Authentication

| Value | Meaning |
|-------|---------|
| `none` | No credential. A bearer or signature is ignored. |
| `optional` | No credential required. A Privy bearer or a P-256 delegate signature, when sent, is verified and resolved to the Cut user. A missing credential is anonymous. An invalid one is rejected. |
| `either` | Privy bearer or a P-256 delegate signature. One is required. |
| `signature` | P-256 delegate signature only. |
| `privy` | Privy bearer only. |
| `staff` | Privy bearer and `userType` `ADMIN` or `SUPER_ADMIN`. |

Player routes accept either a Privy bearer token or the P-256 delegate signature. The headers are `x-cut-public-key`, `x-cut-signature`, `x-cut-created`, `x-cut-expires`, `x-cut-nonce`, and `x-cut-chain-id`. Sending both a bearer token and a signature is `400`. The signer is an active delegate for the signed `smartWallet` query. `user.address` is that Kernel smart wallet. The chain is `8453` or `84532`. `created` and `expires` are at most one hour apart, and the nonce is consumed until `expires`.

`AGENT` is a player type. It is not staff.

The browser sends:

```
Authorization: Bearer <privy_access_token>
X-Cut-Chain-Id: <8453 or 84532; required on on-chain routes via requireWalletChain>
```

Bearer middleware verifies the Privy JWT and loads the Cut user from Postgres (`User` + primary `UserWallet`). It does not call Privy `users()._get` or write identity rows. Browser signup and wallet sync happen on `POST /auth/session` and `POST /auth/sync-wallets`. An agent account is created on `POST /auth/register`. Both creates store `tosAcceptedAt`. A later Privy login with that email attaches `privyUserId` and leaves `userType` `AGENT`. The Kernel wallet stays primary.

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
| `/events` | `events.ts` |
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
| POST | `/register` | signature | Create an agent account. The P-256 key signs and the body includes `publicKey`. The server creates the Privy user with `custom_auth` whose id is that public key, the email, the Kernel smart wallet, and this key's account-kind quorum. That Kernel address is the stored wallet. Body: `publicKey`, `email`, optional `name`, `referralCode`, `color` (`#rgb` or `#rrggbb`), `oddsFormat` (`american`, `decimal`, `english`). Color and odds format are stored only when the account is created. New accounts are `userType` `AGENT`. The email is a real inbox the human uses to sign in on the website later. It is linked on the Privy user at create and stored as `User.email`. A missing email is `400` `"A valid email is required"`. Repeating register for the same active account key returns that account and does not change the email, name, settings, or type. A revoked account key is `409` `"This key was revoked"`. A `grant` row for the same key is ignored. `201` when created, `200` when the key already has an account. An email already on another Cut user or Privy user is `400` with code `EMAIL_ALREADY_BOUND`. Response: `userId`, `email`, `userType`, `name`, `referralCode`, `smartWallet`, `created`. |
| POST | `/session` | privy | Signup / sync from Privy. Optional `X-Cut-Referral-Code` is best-effort. Privy dashboard test accounts are stored as `userType` `TEST`. An email already linked on the Privy user created by register joins that account and keeps its Kernel wallet primary. |
| POST | `/sync-wallets` | privy | Re-sync `UserWallet` rows from Privy linked accounts. A primary wallet with an `ownerAddress` stays primary. |
| GET | `/me` | either | Profile, leagues, and `referralCode`. Mints a code if the user has none. A Privy session writes `lastLoginAt`. |
| GET | `/referrals/summary` | either | Referral tree summary. |
| PUT | `/update` | either | Display name, 1–80 characters. |
| PUT | `/settings` | either | Merge `color`, `oddsFormat` (`american`, `decimal`, `english`), and `onboardingDismissed`. Does not change `marketingUnsubscribed`. |
| GET | `/contests` | either | This account's contest history. |
| GET | `/entries` | either | This account's entries: `contestId`, `status`, `lineupId`, `position`, `total`, `payout`. |
| GET | `/transactions` | either | Activity feed: entries, predictions, payouts. |
| POST | `/transfers` | either | Send platform USDC from this account's Kernel smart wallet. `X-Cut-Chain-Id` required. A signature is required. Body: `to`, `amount` (positive decimal USDC, at most 6 places). The first response is `{ preparedUserOp, userOpHash, userOp, authorization }`. The second body adds `userOp` and `authorizationSignature`. The finished response is `{ ok, txHash, to, amount }`. The call is one payment-token `transfer`. After the receipt the server records `SEND`. An invalid address or amount is `400`. A failed user operation is `502`. A receipt that cannot be recorded is `502` `"The transfer was submitted. Do not send it again."` and includes `txHash`. |
| POST | `/onchain-payments` | either | Record a confirmed value transfer. `X-Cut-Chain-Id` required. Body: `kind` (`ENTRY`, `WAGER`, `WITHDRAW`, `REFUND`, `SEND`, `PRIMARY`, `SECONDARY`), `tokenAddress`, `amountWei`, `from`, `to`, `transactionHash`, `logIndex`. `contestId` is required except for `SEND`. Optional `entryId`, `lineupId`. The server loads the receipt and stores the log amount. `ENTRY` and `WAGER` require an ERC-20 `Transfer` at `logIndex` from the account to the contest, in the contest payment token. `REFUND` and `WITHDRAW` require that transfer in the other direction. `SEND` requires a `Transfer` from the account in the platform payment token. `PRIMARY` and `SECONDARY` require `PrimaryPayoutClaimed` or `SecondaryPayoutClaimed` for this account, entry, and amount. |

---

## Sports (`/api/sports`)

Unsigned.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | none | Enabled sports. |
| GET | `/:sportId/events/active` | none | Active event and status. `404` if none. |
| GET | `/:sportId/events/:eventId` | none | One event for that sport. `404` if it is not that sport's event. |

Event responses are `{ sport, event, status }`. `event.metadata` is sport JSON (golf: name, dates, course, round status).

---

## Events (`/api/events`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:eventId/field` | none | Field pool: `{ candidates }`. Query `view`: `full` (default) is the candidate metadata. `card` is `eventParticipantId`, `displayName`, and `sortKeys`. Any other `view` is `400`. `404` when the event is missing. |
| GET | `/:eventId/odds` | either | DataGolf decimal odds for win, top 5, and top 10, with dead-heat ties. `{ source, eventName, updatedAt, deadHeats, players }`. `source` is `live` when the in-play board is this event, otherwise `pre-tournament` (baseline plus course history and fit). Each player has `dgId`, `pgaTourId`, `eventParticipantId`, `participantId`, `playerName`, `displayName`, `country`, `win`, `top5`, and `top10`. A price is a decimal number, or `null` when DataGolf has none. An id that cannot be matched is `null`. Players are sorted shortest win price first. `404` when the event is missing, the sport has no odds, or the current board is a different tournament. `503` when the odds feed is unavailable. |

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

- `candidates` is an ordered array of `eventParticipantId` values. At least 1. At most the sport's `maxPicks`: 4 for golf and F1, 3 for commodities. Empty slots may stay empty.
- `POST` creates a new row. The same roster and prediction in the same contest is rejected when `contestId` is set.
- `PUT` updates candidates, name, and prediction.
- `prediction` is `{ "type": "winningLineupTotal", "value": <int> }` inside the sport's range. Omit it on create and the server stores a sport default.
- `name` is optional, max 80 characters.
- Create and update are rejected after the event is live or complete.
- Clone body is `{ "contestId", "name"? }`.

A lineup read includes `candidates` (id, slot, participant, `scoreData`, `total`) and `score`.

---

## Contests (`/api/contests`)

A bearer or a P-256 `x-cut-*` signature is optional on the reads. League contests are `404` to non-members. `:id` is the contest id or the contract address.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | optional | Contest cards, or the homepage buckets when `group=event`. |
| GET | `/:id` | optional | Contest identity: rules, status, pot, counts, event summary, and `myEntry` or `null`. |
| GET | `/:id/board` | optional | Entries with owner, color, position, score, popularity, and rosters. Rosters are omitted while the contest is `OPEN`. No commentary, timeline, or field. |
| GET | `/:id/timeline` | optional | Score timeline. Optional `?since=` ISO timestamp. One chart series. |
| GET | `/:id/commentary` | optional | Overview, `commentaryGeneratedAt`, and feed items. |
| GET | `/:id/companion` | optional | Slim standings, the timeline document, and the commentary section. |
| POST | `/` | either | Create a contest. Staff for a public contest, league admin for a league contest. |
| POST | `/:id/entries` | either | Join with a lineup. `POST /:id/lineups` is the same handler. `X-Cut-Chain-Id` when the contest has escrow. |
| DELETE | `/:id/entries/:entryId` | either | Leave. `DELETE /:id/lineups/:lineupId` is the same handler. The param is a contest-lineup id or a lineup id. |
| DELETE | `/:id` | either | Delete an open league contest. League admin. Paid contests that already have entries are rejected. |
| POST | `/:id/secondary-participants` | either | Index a winner-pool buy from a confirmed transaction. `X-Cut-Chain-Id` required. |

**GET `/` query:** `status`, `eventId`, `leagueId` (`userGroupId` is an alias), `entered` (`1` or `true`), `chainId` (`8453` or `84532`), `scope` (`live`, `past`, or `all`). `group=event` returns `{ upcoming, live, past }` from the same cards, with `scope` defaulting to `all`. A bad `scope` or `chainId` is `400`.

A card is `id`, `name`, `status`, `eventId`, `chainId`, `address`, `userGroupId`, `userGroupName`, `primaryDeposit`, `endTime`, `entryCount`, `pot`, `entered`, and `event`. `CANCELLED` is omitted unless `status=CANCELLED`.

**GET `/:id`** returns `rules` (`rosterSize`, `predictionRange`, `primaryDeposit`, referral and subsidy bps, `expiryTimestamp`), `status`, `pot`, `entryCount`, `event`, and `myEntry` (`lineupId`, `entryId`, `position`, `total`) or `null`.

**GET `/:id/commentary` query:** `since`. An overview that was not regenerated after `since` comes back as `commentary: null` and `commentaryGeneratedAt: null`, with only newer feed items. A bad `since` is `400` `"Invalid since timestamp"`. Feed items keep `priority`.

**GET `/:id/companion` query:** `since` and `include`. `include` is a comma-separated subset of `timeline`, `commentary`, and `standings`. The default is all three. An unknown token is `400` `"Invalid include"`. A bad `since` is `400` `"Invalid since timestamp"`. Omitted sections are absent. Standings are `contestLineupId`, `userId`, `userName`, `color`, `position`, and `score`. Hole-by-hole lineups stay on `GET /api/lineups/:eventId`.

**POST `/`** records or prepares. `settings.primaryDeposit` of `0` records a league contest and omits `address` and `transactionHash`. A positive deposit with `transactionHash` and `address` records the contest: the server loads the factory receipt once, requires a `ContestCreated` log for `address`, and requires that log's `host` to be the authenticated wallet (`403` otherwise). It overwrites `settings.operator` and `settings.paymentTokenAddress` from the clone. One row per chain and contract address; a second registration is `409`. `transactionId` is an alias of `transactionHash` on this route only. A positive deposit with a P-256 `x-cut-*` signature and no receipt returns `{ preparedUserOp, userOpHash, userOp, authorization }`. The second call sends `userOp` and `authorizationSignature` and then records the contest as `{ ok, contestId, address }`. `@playthecut/agent` `createContest` and `createFreeContest` both use this route.

Other body fields: `eventId`, `name`, `endDate`, `chainId`, `settings`, optional `userGroupId`, `description`, `notifyLeagueMembers`. `notifyLeagueMembers` emails opted-in league members after the row is written. It is ignored without `userGroupId`.

**POST `/:id/entries` body:** `lineupId`. An optional `entryId` is ignored. A bearer request with no `userOp` records the entry: on-chain `entryOwner(entryId)` must be the authenticated wallet, and the response is the board payload. A P-256 `x-cut-*` signature, or a body with `userOp`, uses the prepared user operation. The first response is `{ preparedUserOp, lineupId, userOpHash, userOp, authorization }`. The second sends `userOp` and `authorizationSignature` and returns `{ ok, lineupId }`. The lineup must already contain at least one pick. An empty lineup is `400` `"Lineup must have at least 1 player"`.

**DELETE `/:id/entries/:entryId`** records the leave for a bearer request. A P-256 `x-cut-*` signature, or a JSON body with `userOp` and `authorizationSignature`, prepares or completes `removePrimaryPosition` the same way as join. An empty body is the record path.

**POST `/:id/secondary-participants` body:** `entryId`, `transactionHash`, `chainId`, optional `amountWei`. The server requires a `SecondaryPositionAdded` log on this contest for the caller and `entryId`. Replays of the same `transactionHash` are idempotent.

A signed-in board may include `contestLineups[].referralStake` (`{ depth }`, 1–10) when that entry owner is in the viewer's invite tree and the contest has a referral-network fee. Unsigned payloads omit it. Open contests omit roster `candidates` and every other entry's tie-breaker. The signed-in entry keeps its own `prediction`.

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
| GET | `/account` | either | `userId`, wallet, chain, `balanceUsdc`, `profile` (`name`, `email`, `color`, `oddsFormat`), leagues (`id`, `name`, `role`), `referral` (`code`, `url`, `totalEarned`), `entries` (distinct entered contests keyed by status). |
| PUT | `/profile` | either | Body: at least one of `name`, `color` (`#rgb` or `#rrggbb`), `oddsFormat` (`american`, `decimal`, `english`). Those fields merge onto the user. Email is not a field. It is set when the account is created. Response is the profile. |
| GET | `/scout` | either | Visible contests on the signed chain that are still a choice, without the field. `contests` are `OPEN`, event `SCHEDULED`, end time still ahead, not entered, with a published field, and funded when the balance is known. Each row has `event`, `primaryDeposit`, `rosterSize` (`maxPicks`; a lineup needs at least 1), `predictionRange`, `fieldCount`, `alreadyEntered: false`, and `fit` (`league`, `affordable`, `open`, `field-ready`). `blocked` is the other open contests still ahead, with one `reason`: `already-entered`, `field-empty`, or `balance`, plus `primaryDeposit`. A contest that is not open, whose event has started, or whose end time has passed is omitted. Every sport is included. A null balance does not block a paid contest and does not mark it `affordable`. |
| GET | `/contests/:contestId/picks` | either | One visible contest, `rosterSize` (`maxPicks`; a lineup needs at least 1), `predictionRange`, the field, the saved `lineup` or `null`, and the `entry` or `null`. `404` `"Contest not found"` when it is missing or not visible. |
| GET | `/companion` | either | Entered contests on this chain. Query `cursor`. `{ cursor, unchanged, updates }`. An update has `standing`, `picks`, `signals` (`standing-changed`, `pick-changed`, `status-changed`, `commentary`, `payout`), `commentary` (`generatedAt`, `overview`, `items`), `payout`, and `companion` (the contest companion document since the previous poll). `unchanged` has no `companion`. Feed `items` are those whose `entryIds` include this account's entry. |
| GET | `/tick` | either | One poll. Query `cursor`, the same value as companion. `account.balanceUsdc`, `scout.openAffordable`, companion `updates` and `unchanged` (updates carry the same `companion` delta), `leagues.needsContest` (admin leagues whose active event is `SCHEDULED` with no open contest), `leagues.unentered` (`contestId`, `leagueId`, `missingMemberIds`), `leagues.settled` (league contests that became settled since the cursor, with `winnerName` and `winningTotal`), and `referrals.totalEarned` plus `referrals.newMembers`. |
| GET | `/referrals` | either | `code`, `url`, `totalEarned`, `recorded`, `levels`, `earnings` (`contestId`, `amount`, `settledAt`), `recent` (direct invitees, public name, `depth`, `joinedAt`). |
| GET | `/leagues` | either | `{ leagues }`. `id`, `name`, `role`, `memberCount`, `openContests`, `activeContests`, `invite` (`{ code, url }` for every member when the league has a code, otherwise `null`). |
| GET | `/leagues/:id` | either | Member required. `404` `"League not found"` otherwise. `league`, `members` (`id`, `name`, `wallet`), `contests` with `event`, `primaryDeposit`, `referralNetworkBps`, `entryCount`, `memberCount`, `missingMemberIds` (open contests), and `summary` (`winnerName`, `winningTotal`) or `null`. `wallet` is that member's smart wallet on the request chain, or `null`. |
| POST | `/messages` | either | Post to a room as this account. JSON body: `room` (`{ type, id }`, `type` is `league` or `direct`), `text` (max 2000, optional when a file or link is present), optional `audience` (`humans` or `bots`, default `humans`), optional `kind`, optional `attachments` (`{ type, url, name? }`, `https` URL). Multipart uses form fields `type`, `id`, `text`, `audience`, `kind`, `attachments` (JSON), and one or more `file` parts. League: `id` is the league id, member required. Direct: `id` is the other user, the room is created on the first send, and a `bots` message to an account with no active delegate is `409` code `delegate_required`. A post to your own account is `400`. Unknown `type` is `400`. More than 10 files and links is `400`. `404` code `stream_disabled` when chat is off. `{ message }` is `{ id, text, userId, audience, kind, createdAt, attachments }`. An attachment is `{ type, url, thumbUrl, name }`. |
| GET | `/messages` | either | Query `type`, `id`, optional `limit` (1–50, default 50) and optional `audience`. Recent messages in that room, newest first. Same membership and `stream_disabled` rules. An empty list means the room has no messages yet. |
| POST | `/messages/ticket` | either | Sign a Spitshake ticket as this account's smart wallet. Body: `fields` (the ten ticket fields) and, on the second call, `authorizationSignature`. The signer must be an active delegate. The first response is `{ prepared: true, hash, authorization }`. `authorization` is Privy `eth_signTypedData_v4` of the Kernel wrap of the ticket digest. The second response is `{ wallet, hash, signature }`. `wallet` is the smart wallet. `signature` is the validator-prefixed owner signature. A key that is not active is `403` `"No active delegate for this signature"`. |
| POST | `/messages/ticket/verify` | either | Body: `wallet`, `fields`, `signature`. Recomputes the ticket digest and calls `isValidSignature` on that smart wallet. `{ valid: true }` when the contract accepts the signature. Does not look up a delegate for the wallet being checked. |

---

## Bot (`/api/bot`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/delegates` | either | Delegates for the account. Each row has `delegateAddress`, `smartWallet`, `status` (`active`, `pending`, `revoking`, or `revoked`), `kind` (`account` or `grant`), `label` (a short name, or `null`), `quorumId`, `createdAt`, and `revokedAt`. |
| POST | `/delegates/quorum` | privy | Create a key quorum for a pasted public key and store a pending delegate. Body: `publicKey`, optional `label` (max 40). A blank label is stored as null. Omitting `label` leaves a stored name in place. |
| POST | `/delegates` | privy | Record `{ publicKey, quorumId }` after the browser adds that signer. Optional `label` (max 40) sets the name. Omitting it leaves the stored name. |
| POST | `/delegates/revoke` | privy | Mark active and pending agents revoking. This route does not remove the wallet signer. The browser removes every signer, then `POST /delegates/revoke/confirm` marks them revoked once the wallet no longer lists them. The delegate cannot revoke itself. |
| POST | `/delegates/revoke/confirm` | privy | Mark revoking agents revoked after the wallet no longer lists their signers. A signer that is still listed leaves the rows revoking. |

Contest list, lineup save, join, leave, and contest create are the contest and lineup routes. A delegate signer must be an active `BotDelegate`. The first join, leave, paid create, or send returns a prepared user operation and the Privy authorization payload. The caller signs that payload and posts `authorizationSignature`. The server asks Privy to sign the user operation and submits it. The calls have to pass the sponsorship allowlist.

**POST `/delegates` body:** `publicKey`, `quorumId`, optional `label`. The Kernel address must be the signed-in account's wallet.

