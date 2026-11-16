# Agents

An agent plays through signed HTTP requests. The browser is a separate client: a person signs in with Privy there to install or revoke a delegate, and can still enter a contest from the app.

Play The Cut has three ways to sign a contest entry.

1. **No delegate.** The logged-in client signs the chain transaction. The bot routes do not apply.
2. **Cut Bot.** The user allows Cut Bot's address in Settings. The server holds that key and can submit a join or leave while the user is away.
3. **Personal delegate.** The user pastes a public address and approves the same install. That key signs requests and user operations. The private key is never sent to Play The Cut.

Both delegates are a Kernel v3.1 session key on EntryPoint 0.7. The key can submit any call the wallet can. It is not a second owner. The action API still rejects a join unless `approve` spends the contest deposit to that contest and the next call is `addPrimaryPosition` on the same contest. A key that skips the API is not limited by that check.

The wallet owner can also sign the HTTP request. The server checks that signature with ERC-1271 on the smart wallet. Contest reads and lineup saves work with no delegate. Join and leave still submit through an active Cut Bot key.

## Authentication

`GET /api/bot/contests` and `POST /api/bot/actions` use [ERC-8128](https://erc8128.org). There is no Privy session and no signature field in the query or body.

Sign with `@slicekit/erc8128` `signRequest`. The signature is Request-Bound and Non-Replayable. `@slicekit/erc8128` covers `@scheme`, `@authority`, `@method`, `@path`, and `@query`, plus `content-digest` and `content-type` when the request has a body. Parameters are `keyid`, `created`, `expires`, `nonce`, and `tag="erc8128"`.

`keyid` is `eip8128:<chainId>:0x<signer>`. The chain is `8453` or `84532` and must equal `chainId` on the request. `created` and `expires` are unix seconds. `expires - created` is at most one hour. `nonce` is a single-use ASCII string of at most 128 bytes. The server stores `(keyid, nonce)` until `expires`.

The signer is the session-key address, or the smart wallet when the owner signs. A signature over a changed method, path, query, or body is rejected.

`server/src/scripts/signBotRequest.ts` signs one contest list and one lineup save:

```
BOT_DELEGATE_PRIVATE_KEY=0x… SMART_WALLET=0x… pnpm --filter server run script:sign-bot-request
```

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

Cut Bot, or the wallet owner when Cut Bot is installed, signs the user operation. The response is `{ ok: true, lineupId }`. An owner with no active Cut Bot receives `403`.

A personal delegate omits `userOpSignature` on the first join. The response is `{ preparedUserOp: true, lineupId, userOpHash, userOp }`. Sign `userOpHash` and POST the same body again with `userOpSignature` and that `userOp`. That second request needs its own nonce. The server submits that user operation only when its call data is still the join for this lineup.

### 3. leave

Open or cancelled contests. Same request shape as join, with `action` `leave` and the lineup id. The server submits `removePrimaryPosition`. A personal delegate uses the same `preparedUserOp` step. An owner uses Cut Bot the same way as join.

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

`userOpSignature` and `userOp` are only on the personal delegate's second join or leave. Cut Bot and the wallet owner omit both.

`userOpSignature` is the delegate's EIP-191 signature of the raw 32-byte `userOpHash`: `signMessage({ message: { raw: userOpHash } })`. Do not prefix it. The server adds the permission-plugin prefix and submits the returned `userOp` unchanged.

A failed join is logged as `error` and does not create an entry. The log stores the action and the time. The lineup, contest entry, and transaction hash stay on their own records.

## Settings

`GET /api/bot/delegate-address` returns Cut Bot's public address, or `null` when the server key is unset. No signature.

A signed-in user records an approval with `POST /api/bot/delegates`. These settings routes use the Privy bearer token. The first approval is the owner's enable signature. Kernel installs the key and grants `execute` on the first `join` or `leave`. Allowing the same key again after a revoke sends an install transaction:

- `kind`: `cut_bot` or `external`
- `delegateAddress`
- `smartWallet`
- `approval`: serialized permission account
- `permissionId`: the 4-byte Kernel permission id

`POST /api/bot/delegates/revoke` with `delegateAddress` records the revoke. When the key is already on the wallet, that request follows the on-chain uninstall.

`GET /api/bot/delegates` lists the signed-in user's delegates.
