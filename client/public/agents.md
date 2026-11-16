# Agents

The account is one wallet. A person signs in with Privy in the browser, installs or revokes a delegate, and can enter a contest from the app. An agent can register that wallet itself and sign the same player routes. The route list is `spec/server/api.md`. This page is how to sign, and how the play actions work.

A delegate is a key the user installs on that wallet so another client can act for them. The delegate signs this API. The server may hold the key, or the caller may hold it. Both are the same kind of key.

Three ways to sign a contest entry:

1. **The user, in the browser.** The logged-in client signs the chain transaction. These routes do not apply.
2. **A delegate the server holds.** The user allows that address in Settings. The server can submit a join or leave while the user is away. Stored as `kind` `cut_bot`.
3. **A delegate the caller holds.** The user pastes a public address and approves the same install. That key signs requests and user operations. The private key never comes to Play The Cut. Stored as `kind` `external`.

A delegate is a Kernel v3.1 session key on EntryPoint 0.7, installed on the user's wallet. It can submit any call the wallet can. The action API still rejects a join unless `approve` spends the contest deposit to that contest and the next call is `addPrimaryPosition` on the same contest. A key that skips the API is not limited by that check.

The user can also sign the HTTP request as the smart wallet. The server checks that signature with ERC-1271. Contest reads and lineup saves need no delegate. Join and leave still go out through an active server-held delegate.

## Authentication

Player routes accept a Privy bearer token or an [ERC-8128](https://erc8128.org) signature. `GET /api/bot/contests` and `POST /api/bot/actions` are signature-only. There is no signature field in the query or body. A request that sends both a bearer token and a signature is rejected.

Sign with `@slicekit/erc8128` `signRequest`. The signature is Request-Bound and Non-Replayable. `@slicekit/erc8128` covers `@scheme`, `@authority`, `@method`, `@path`, and `@query`, plus `content-digest` and `content-type` when the request has a body. Parameters are `keyid`, `created`, `expires`, `nonce`, and `tag="erc8128"`.

A delegate names the account with `smartWallet` in the query, because the signature covers `@query`. When the signer is the wallet, omit that query. `user.address` is the wallet. When `X-Cut-Chain-Id` is present it must match the signature chain.

These stay on a Privy session: `POST /api/auth/session`, `POST /api/auth/sync-wallets`, delegate install and revoke, and `/api/admin`. Public sport, event, and field routes stay unsigned. `AGENT` is a player type. It is not staff, so an agent signature on an admin route is rejected and an agent cannot create a public contest.

`keyid` is `eip8128:<chainId>:0x<signer>`. The chain is `8453` or `84532` and must equal `chainId` on the request. `created` and `expires` are unix seconds. `expires - created` is at most one hour. `nonce` is a single-use ASCII string of at most 128 bytes. The server stores `(keyid, nonce)` until `expires`.

The signer is the delegate address, or the smart wallet when the user signs. A signature over a changed method, path, query, or body is rejected.

`server/src/scripts/signBotRequest.ts` signs one contest list and one lineup save:

```
BOT_DELEGATE_PRIVATE_KEY=0x… SMART_WALLET=0x… pnpm --filter server run script:sign-bot-request
```

## Account

`POST /api/auth/register` creates the account. The wallet signs. A `smartWallet` query that is not the signer is rejected. Body: `email` (required), optional `name`, optional `referralCode`. A new account is `userType` `AGENT`. Registering the same wallet again returns that account and does not change the email or type. Email already on another account is `EMAIL_ALREADY_BOUND`.

Response: `userId`, `email`, `userType`, `name`, `referralCode`, `smartWallet`, `created`. `201` when the account is new, `200` when the wallet already has one.

`GET /api/auth/me`, `PUT /api/auth/update`, and `PUT /api/auth/settings` then read and write that account. League routes, lineup save, contest reads, `$0` contest create, and recording a paid contest the caller already deployed are the existing `/api/userGroups`, `/api/lineups`, and `/api/contests` routes with the same signature. Directory and lobby membership for an account with no Privy id uses the Cut user id.

## Contests

`GET /api/bot/contests` returns the contests this signer can enter, each with its field.

Query: `chainId`, `smartWallet`. Optional `eventId` limits the list to one event.

Visibility matches `GET /api/contests`: public contests, plus league contests in leagues the signer's user belongs to.

```json
{
  "contests": [
    {
      "contestId": "contest id",
      "name": "Contest",
      "eventId": "event id",
      "sportId": "pga-golf",
      "chainId": 8453,
      "status": "OPEN",
      "address": "0x…",
      "userGroupId": null,
      "userGroupName": null,
      "primaryDeposit": 5,
      "endTime": "2026-11-16T00:00:00.000Z",
      "candidates": [
        {
          "eventParticipantId": "id sent back in lineupUpsert",
          "participantId": "stable participant id",
          "displayName": "Name",
          "sortKeys": {},
          "metadata": {}
        }
      ]
    }
  ]
}
```

Contests on the same event share one candidate pool. `lineupUpsert` sends the chosen `eventParticipantId`s.

## POST /api/bot/actions

One signed request does one thing. Save the lineup first. Join and leave use that lineup id and do not change its picks.

`candidates` is an ordered array of `eventParticipantId` values. Order is the lineup order. Only `lineupUpsert` sends it. `join` and `leave` omit it.

### 1. lineupUpsert

Creates a lineup when `lineupId` is `""`. Updates that lineup when `lineupId` is set. Same picks for the same contest return the existing id. No transaction.

```json
{
  "chainId": 8453,
  "action": "lineupUpsert",
  "smartWallet": "0x…",
  "contestId": "contest id",
  "lineupId": "",
  "candidates": ["eventParticipantId", "eventParticipantId"],
  "prediction": { "type": "winningLineupTotal", "value": 142 }
}
```

`prediction` is optional. Omit it and the server stores a random integer inside that sport's prediction range. For golf the number is the winning-score tiebreaker. Send `{ "type": "winningLineupTotal", "value": 142 }` to choose it. `value` is an integer. A value outside the sport's range is rejected. The HTTP signature covers `prediction` because it covers the body.

The response is `{ ok: true, lineupId }`.

### 2. join

Open contests only. Requires the `lineupId` from `lineupUpsert`. The server builds `approve` of the contest deposit and `addPrimaryPosition` for that lineup. It does not read `candidates`.

A server-held delegate signs the user operation, including when the user signed the HTTP request and that delegate is installed. The response is `{ ok: true, lineupId }`. A user with no active server-held delegate receives `403`.

A caller-held delegate omits `userOpSignature` on the first join. The response is `{ preparedUserOp: true, lineupId, userOpHash, userOp }`. Sign `userOpHash` and POST the same body again with `userOpSignature` and that `userOp`. That second request needs its own nonce. The server submits that user operation only when its call data is still the join for this lineup.

### 3. leave

Open or cancelled contests. Same request shape as join, with `action` `leave` and the lineup id. The server submits `removePrimaryPosition`. A caller-held delegate uses the same `preparedUserOp` step. A server-held delegate signs leave the same way it signs join.

```json
{
  "chainId": 8453,
  "action": "join",
  "smartWallet": "0x…",
  "contestId": "contest id",
  "lineupId": "lineup id",
  "userOpSignature": "0x…",
  "userOp": {}
}
```

`userOpSignature` and `userOp` are only on the second join or leave of a caller-held delegate. A server-held delegate, and the user signing as the wallet, omit both.

`userOpSignature` is the delegate's EIP-191 signature of the raw 32-byte `userOpHash`: `signMessage({ message: { raw: userOpHash } })`. Do not prefix it. The server adds the permission-plugin prefix and submits the returned `userOp` unchanged.

### 4. createContest

Paid contest the server deploys. A league admin, or staff, may create one. An `AGENT` creating a public contest is rejected. The body has `name`, `eventId`, `endDate`, and `settings` with `primaryDeposit` greater than zero. Optional `description`, `userGroupId`, and `notifyLeagueMembers`. There is no transaction hash.

The server builds `ContestFactory.createContest` and submits it the same way as join: a server-held delegate returns `{ ok: true, contestId, address }`, and a caller-held delegate first receives `{ preparedUserOp: true, userOpHash, userOp }`. A self-registered wallet that sends its own factory transaction records it on `POST /api/contests` instead. A `$0` contest is that same route and stays in the database.

A failed join is logged as `error` and does not create an entry. The log stores the action and the time. The lineup, contest entry, and transaction hash stay on their own records.

## Settings

`GET /api/bot/delegate-address` returns the public address of the server-held delegate, or `null` when that key is unset. No signature.

The signed-in user records an approval with `POST /api/bot/delegates`. Install and revoke use the Privy bearer token. The first approval is the user's enable signature on the wallet. Kernel installs the key and grants `execute` on the first `join` or `leave`. Allowing the same key again after a revoke sends an install transaction:

- `kind`: `cut_bot` (the server holds the key) or `external` (the caller holds the key)
- `delegateAddress`
- `smartWallet`
- `approval`: serialized permission account
- `permissionId`: the 4-byte Kernel permission id

`POST /api/bot/delegates/revoke` with `delegateAddress` records the revoke. When the key is already on the wallet, that request follows the on-chain uninstall.

`GET /api/bot/delegates` lists the signed-in user's delegates.
