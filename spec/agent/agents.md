# Agents

`@playthecut/agent` signs and sends the routes on this page. Install it, store one delegate key, and the same client can list contests, save a lineup, join, leave, register, and deploy a paid contest. Install and revoke stay on the user's Privy session. The route list is [spec/server/api.md](../server/api.md).

## What Play The Cut is

Play The Cut is a contest on a live competition. A user, or an agent acting for that user, picks a lineup from the field and enters it in a contest. The lineup score is the sum of its picks. A higher total wins. A tie breaks on `prediction`, a guess of the winning lineup's total.

| Term | Meaning |
|------|---------|
| Event | One competition, such as a golf tournament, a race, or a commodities week. |
| Field | The candidate pool for that event. On `contests()`, this is `candidates`. |
| Lineup | The ordered picks sent to `lineupUpsert`. The JSON field is also named `candidates`. |
| Entry | A lineup that has joined a contest. |
| Contest | A paid or free competition over one event. Public, or inside a league. |
| League | A private group. League contests require membership. Creating one requires a league admin. |
| Tie-breaker | `prediction`: `{ "type": "winningLineupTotal", "value": <integer> }`. |

`candidates` on a contest is the field. `candidates` on `lineupUpsert` is the lineup, in order. The ids are `eventParticipantId` values from that field.

| Sport | Picks | Prediction range |
|-------|-------|------------------|
| `pga-golf` | Up to 4 | 1–250 |
| `f1` | Up to 4 | 1–120 |
| `commodities` | Up to 3 | −100–250 |

A lineup may be saved with fewer picks (`minPicks` is 0). A contest entry uses a full roster: 4 for golf and F1, 3 for commodities. Duplicate picks are rejected.

Contest status is `OPEN`, `ACTIVE`, `LOCKED`, `SETTLED`, `CANCELLED`, or `CLOSED`. `join` is accepted only while the contest is `OPEN`. `leave` is accepted while it is `OPEN` or `CANCELLED`.

## Money and accounts

The entry fee is USDC on Base (`chainId` `8453`) or Base Sepolia (`84532`). It is spent from the user's **smart wallet**, the account the delegate is installed on. It is not spent from the delegate key, and it is not spent from the embedded signer. Gas for the join, leave, and contest-create user operation is sponsored.

The user reads that address on Account (`/account/settings`). Funds are added from Account → Wallet (`/account/funds`). Pass the same address as `smartWallet` to `createCutAgent`.

## Setup

Do this once per user.

1. Call `generateDelegateKey()` once. Store `privateKey` with the caller. Send `address` to the user. Running it again creates a different key and the stored grant stops matching.
2. The user signs in and opens Account → Settings → Delegate account control → Bring your own agent.
3. The user pastes the address and chooses **Grant full access**.
4. `createCutAgent({ privateKey, smartWallet, chainId })`. `origin` defaults to `https://playthecut.com`. Omit `smartWallet` only when the signer is the wallet itself.
5. Call `contests()`. An empty list means there is no `OPEN` contest this wallet can enter, or the grant is not active yet.

```ts
import { generateDelegateKey } from "@playthecut/agent";

const key = generateDelegateKey();
// Store key.privateKey. Send key.address to the user. Do not run this again.
```

**A delegate can submit any call the smart wallet can, including sending the USDC in that wallet.** The action API checks the shape of a join. A key that skips the API is not limited by that check. Keep the private key off Play The Cut's servers and out of logs. The user revokes it from the same Settings section, which calls `POST /api/bot/delegates/revoke` on their Privy session. The delegate signature cannot revoke itself. Revoke does not reverse a transaction that already landed.

## Quickstart

Use the stored key. Pick an `OPEN` contest, send a full roster, set the tie-breaker, save the lineup, then join. `join` signs the prepared user operation inside the SDK. The value the caller receives is `{ ok: true, lineupId }`.

```ts
import { createCutAgent } from "@playthecut/agent";

const agent = createCutAgent({
  privateKey: process.env.CUT_DELEGATE_PRIVATE_KEY as `0x${string}`,
  smartWallet: "0x…",
  chainId: 8453,
});

const { contests } = await agent.contests();
const contest = contests.find((row) => row.status === "OPEN");
if (!contest) throw new Error("No open contest");

const rosterSize = contest.sportId === "commodities" ? 3 : 4;
const picks = contest.candidates.slice(0, rosterSize).map((row) => row.eventParticipantId);

const { lineupId } = await agent.lineupUpsert({
  contestId: contest.contestId,
  candidates: picks,
  prediction: { type: "winningLineupTotal", value: 142 },
});

const joined = await agent.join({ contestId: contest.contestId, lineupId });
// joined is { ok: true, lineupId }
```

`142` is a golf tie-breaker. Use a value inside the sport's range. Commodities and F1 ranges are in the table above.

## Research

Help the user choose before submitting. `contests()` already returns the field.

Each candidate has `eventParticipantId`, `participantId`, `displayName`, `sortKeys`, and `metadata`. For golf, `metadata` is `{ externalId, participant, scoreData, total }`.

| Field | Use |
|-------|-----|
| `sortKeys.owgr` | OWGR. `9999` means the sync had no rank. |
| `sortKeys.dataGolf` | DataGolf rank. `9999` means the sync had no rank. |
| `participant.owgr`, `participant.standings` | OWGR and FedExCup when the profile sync stored them. |
| `participant.dataGolf` | `dg_rank` and `dg_skill` when the DataGolf sync stored them. |
| `participant.performance` | Season stat rows from the PGA profile, when stored. |
| `participant.imageUrl` | Headshot URL. |
| `scoreData.teeTimes` | Tee times, when the event sync stored them. |
| `scoreData` leaderboard fields | Position and total once the round is live. |

Other sports return the same candidate shape. Their `sortKeys` and `metadata` are that sport's, not golf's.

| Id | Scope |
|----|--------|
| `eventParticipantId` | This event. This is the value `lineupUpsert` takes. |
| `participantId` | Play The Cut's stable id for that player across events. |
| `metadata.externalId`, `participant.pgaTourId` | PGA TOUR player id. Aaron Wise is `49964`. The same id is in pgatour.com player URLs and headshot URLs. |
| Data Golf `dg_id` | Not on the candidate. Match Data Golf's player list by name. |

[PGA TOUR](https://www.pgatour.com) has the field, tee times, the live leaderboard, course and hole info, and strokes-gained stats. [Data Golf](https://datagolf.com) has model predictions, skill, course fit, and history. Its API needs the user's own key. Follow Data Golf's terms.

Pull the field from `contests()`. Enrich it. Shortlist with the reason attached. Let the user approve. Then `lineupUpsert` and `join`.

## You are the host

After the user is in, stay on that event and that contest. Tell the user when something changes for their lineup. A leaderboard tick that does not move their team stays quiet. A player making a move, missing the cut, a lock, a settlement, or a payout is worth a message.

The public lobby is `GET /api/contests/:id/lobby` (the same payload as `GET /api/contests/:id`).

| Field | What it is |
|-------|------------|
| `commentary` | The overview. Golf refreshes it about every 20 minutes for entered contests on a live event, once the contest is `ACTIVE` or `LOCKED`. Commodities refreshes it when a trading day settles. |
| `commentaryFeed` | The rolling story feed. Golf writes it as the round develops. Commodities has no rolling feed. |
| `commentaryGeneratedAt`, `commentaryFeedGeneratedAt` | When that document was last written. |

Read the feed for this contest. Pass along an item when it touches the user's players or the user's standing.

These routes take the same signature as the play actions. The SDK does not wrap them.

| Route | What it returns |
|-------|-----------------|
| `GET /api/auth/contests` | This account's contest history. |
| `GET /api/auth/transactions` | Entries, predictions, and payouts. |
| `GET /api/lineups/:eventId` | This account's lineups for that event, including score. |

`GET /api/bot/contests` is the field for contests the wallet can still enter. It is not the list of contests the wallet has already joined.

## Actions

The SDK throws `CutAgentError`. `status` is the HTTP status. `message` is the server's `error` string. `body` is the parsed JSON.

### contests

`agent.contests(eventId?)` → `GET /api/bot/contests`.

| | |
|--|--|
| Required query | `chainId`, `smartWallet` (the SDK sends both) |
| Optional query | `eventId` limits the list to one event |
| Response | `{ contests }`. Each contest includes `contestId`, `name`, `eventId`, `sportId`, `chainId`, `status`, `address`, `userGroupId`, `userGroupName`, `primaryDeposit`, `endTime`, and `candidates`. |
| `primaryDeposit` | Whole USDC. `1` is $1. `null` when the contest has no deposit. |

Visibility matches the contest list: public contests, plus league contests in leagues this account belongs to.

### lineupUpsert

`agent.lineupUpsert({ contestId, candidates, lineupId?, prediction? })`.

| | |
|--|--|
| Required | `contestId`, `candidates` (ordered `eventParticipantId`s) |
| Optional | `lineupId`. Omit it, or send `""`, to create. Send an id to update. |
| Optional | `prediction`. Omit it and the server stores a random integer inside the sport's range. |
| Response | `{ ok: true, lineupId }` |
| No transaction | Saving a lineup does not move USDC. |

The same picks for the same contest return the existing id. A value outside the sport's range is `400` `"Prediction is outside the allowed range for this sport"`.

### join

`agent.join({ contestId, lineupId })`. Open contests only. The server builds `approve` of the contest deposit and `addPrimaryPosition` for that lineup. It does not read `candidates`.

| Signer | What happens |
|--------|----------------|
| Caller-held delegate (`external`) | The SDK omits `userOpSignature` on the first request, receives `{ preparedUserOp: true, lineupId, userOpHash, userOp }`, signs `userOpHash`, and posts again. The caller receives `{ ok: true, lineupId }`. |
| Server-held delegate (`cut_bot`) | The server signs and submits. The response is `{ ok: true, lineupId }`. |
| The smart wallet itself | The server submits only when an active `cut_bot` delegate is installed. Otherwise `403` `"No Cut Bot delegate is installed"`. |

A caller-held delegate does not need a Cut Bot key.

### leave

`agent.leave({ contestId, lineupId })`. Open or cancelled contests. The server submits `removePrimaryPosition`. The signer rules match join.

### createContest

`agent.createContest({ name, eventId, endDate, settings, description?, userGroupId?, notifyLeagueMembers? })`.

Deploys a paid contest. `settings.primaryDeposit` is whole USDC and must be greater than zero. `endDate` is an ISO timestamp or unix milliseconds and is stored as the contest end. `settings.expiryTimestamp` is the on-chain expiry in unix seconds. When it is omitted, the SDK and the server set it to the unix seconds of `endDate`. A positive `expiryTimestamp` is sent as given.

| | |
|--|--|
| Required | `name`, `eventId`, `endDate`, `settings.primaryDeposit` |
| Optional | `description`, `notifyLeagueMembers`, `settings.expiryTimestamp` |
| League contest | `userGroupId` is required, and the signer must be a league admin. Otherwise `403` `"You must be a league admin to create contests for this group"`. |
| Public contest | Omit `userGroupId`. Staff only. An `AGENT` receives `403` `"Forbidden"`. |
| Defaults | `referralNetworkBps` and `primaryDepositSecondarySubsidyBps` default to `0`. |
| Response | `{ ok: true, contestId, address }` after the user operation is submitted. |

A `$0` contest is `POST /api/contests`. `createContest` does not create one, and the SDK does not wrap that route.

The signer rules match join. A caller-held delegate's first response is `{ preparedUserOp: true, userOpHash, userOp }` with no `lineupId`. The SDK signs and posts the second request.

### register

`agent.register({ email, name?, referralCode? })` → `POST /api/auth/register`.

The wallet signs. A `smartWallet` query that is not the signer is rejected. A new account is `userType` `AGENT`. Registering the same wallet again returns that account and does not change the email or type. `201` when the account is new, `200` when the wallet already has one. An email already on another account is `400` with code `EMAIL_ALREADY_BOUND`.

Response: `userId`, `email`, `userType`, `name`, `referralCode`, `smartWallet`, `created`.

## Errors

Fix the request and send it again with a new nonce. A reused nonce is `401`.

| Status | Meaning | What to do |
|--------|---------|------------|
| `400` | The body, the lineup, the deposit, or the prediction is invalid. `EMAIL_ALREADY_BOUND` on register. | Read `error`. A short lineup can be saved; a join still needs the lineup id from `lineupUpsert`. |
| `401` | The signature is missing, expired, or does not cover this request. A nonce was reused. | Sign the exact method, path, query, and body. Use a new nonce. `created` and `expires` must span at most one hour. |
| `403` | The signer is not an active delegate, the wallet signer has no Cut Bot key, the account is not a league admin, or an `AGENT` tried to create a public contest. | Confirm the user granted this address, or install a `cut_bot` delegate when the signer is the wallet. |
| `404` | Contest, event, or user was not found. | Check `contestId` and `eventId`. |
| `409` | Join on a contest that is not `OPEN`, or leave on a contest that is not `OPEN` or `CANCELLED`. A paid contest address was already registered. | Stop retrying the join. Leave only while the contest is open or cancelled. |
| `502` | The user operation failed or the response shape was unexpected. | Read `error`. Do not assume the entry exists until a later `join` returns `{ ok: true }` or the lobby shows the entry. |
| `503` | The server-held delegate key is not configured. | A caller-held delegate is unaffected. A wallet signer cannot submit until that key is set. |

## How it works

Most callers can stop at the actions above.

Three ways to enter a contest:

1. **The user, in the browser.** The logged-in client signs the chain transaction. These routes do not apply.
2. **A delegate the server holds.** The user allows that address in Settings. Stored as `kind` `cut_bot`. The server can submit a join, leave, or paid create while the user is away.
3. **A delegate the caller holds.** The user pastes the public address and grants it. Stored as `kind` `external`. The private key never comes to Play The Cut. This is the key `generateDelegateKey` creates.

A delegate is a Kernel v3.1 session key on EntryPoint 0.7, installed on the user's smart wallet.

Player routes accept a Privy bearer token or an [ERC-8128](https://erc8128.org) signature. `GET /api/bot/contests` and `POST /api/bot/actions` are signature-only. A request that sends both a bearer token and a signature is rejected. There is no signature field in the query or body.

`@slicekit/erc8128` `signRequest` covers `@scheme`, `@authority`, `@method`, `@path`, and `@query`, plus `content-digest` and `content-type` when the request has a body. Parameters are `keyid`, `created`, `expires`, `nonce`, and `tag="erc8128"`. `keyid` is `eip155:<chainId>:0x<signer>` with the signer address lowercase. The chain is `8453` or `84532` and must equal `chainId` on the request. `expires - created` is at most one hour. `nonce` is a single-use ASCII string of at most 128 bytes. The server stores `(keyid, nonce)` until `expires`.

A delegate names the account with `smartWallet` in the query or body, because the signature covers both. When the signer is the wallet, the server checks the signature with ERC-1271. Contest reads and lineup saves need no delegate. Join, leave, and `createContest` for that wallet signer go out through an active `cut_bot` delegate.

On the second request, `userOpSignature` is the delegate's EIP-191 signature of the raw 32-byte `userOpHash`: `signMessage({ message: { raw: userOpHash } })`. The SDK does this. The server adds the permission-plugin prefix and submits the returned `userOp` unchanged.

`GET /api/bot/delegate-address` returns the public address of the server-held delegate, or `null` when that key is unset. No signature. `POST /api/bot/delegates` records an approval on the Privy session: `kind` (`cut_bot` or `external`), `delegateAddress`, `smartWallet`, `approval`, and `permissionId`.

## Referrals and Lightforest

[Lightforest](https://lightforest.mattlovan.dev/implementations/play-the-cut) powers the referral network. A paid contest locks a share of its pool for the winner's invite chain, typically about 7% (`referralNetworkBps`). At settlement that share pays up the chain, as many as 10 ancestors. A free contest pays nothing. The invite is recorded once, at account creation, and it keeps paying when that player, or someone they bring in, wins a later paid contest.

That is an income opportunity. Pass `referralCode` to `register` when this account was invited. `GET /api/auth/me` returns this account's own code. `GET /api/auth/referrals/summary` is this account's downline and `totalEarned`. Share links as `https://playthecut.com/?ref=CODE`.

The summary route is this account only. To inspect another user's relations and earnings, open the [Play The Cut page on Lightforest](https://lightforest.mattlovan.dev/implementations/play-the-cut). Look up a wallet for its referrer, ancestors, children, and payout chain, and read the settled payouts recorded there.
