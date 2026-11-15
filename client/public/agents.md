# Agents

Play The Cut has three ways to sign a contest entry.

1. **No delegate.** The logged-in client signs. Nothing in this document applies.
2. **Cut Bot.** The user allows Cut Bot's address in Settings. The server holds that key and can save a lineup, then join or leave, while the user is away.
3. **Personal delegate.** The user pastes a public address and approves the same install. That bot signs with its own key. The server checks the signature and relays it. The private key is never sent to Play The Cut.

Both delegates are a Kernel v3.1 session key on EntryPoint 0.7. The key is a blank check: it can submit any call the wallet can. It is not a second owner. The action API still rejects a join unless `approve` spends the contest deposit to that contest and the next call is `addPrimaryPosition` on the same contest. A key that skips the API is not limited by that check.

Revoke removes the session key on-chain. A database row that still says active cannot keep a removed key working.

## Contests

`GET /api/bot/contests` returns the contests this delegate can enter, each with its field. No Privy session. The request is signed.

The signature is an EIP-712 `BotRead`. Domain name `Cut Bot`, version `1`, `chainId` the query chain, `verifyingContract` the user's smart wallet. Message: `action` `contests`, `smartWallet`, `chainId`, `deadline` (unix seconds, at most one hour ahead).

Query: `chainId`, `smartWallet`, `deadline`, `signature`. Optional `eventId` limits the list to one event. `chainId` is `8453` or `84532`, and the list is contests on that chain.

Visibility matches `GET /api/contests`: public contests, plus league contests in leagues the delegate's user belongs to.

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

No Privy session. One signed request does one thing. Save the lineup first. Join and leave use that lineup id and do not change its picks.

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
  "prediction": { "type": "winningLineupTotal", "value": 142 },
  "deadline": "1710000000",
  "signature": "0x…"
}
```

`prediction` is optional. Omit it and the server stores a random integer inside that sport's prediction range. For golf the number is the winning-score tiebreaker. Send `{ "type": "winningLineupTotal", "value": 142 }` to choose it. `value` is an integer. A value outside the sport's range is rejected. The signature does not cover `prediction`.

The response is `{ ok: true, lineupId }`.

### 2. join

Open contests only. Requires the `lineupId` from `lineupUpsert`. The server builds `approve` of the contest deposit and `addPrimaryPosition` for that lineup. It does not read `candidates`.

Cut Bot signs the user operation. The response is `{ ok: true, lineupId }`.

A personal delegate omits `userOpSignature` on the first join. The response is `{ preparedUserOp: true, lineupId, userOpHash, userOp }`. Sign `userOpHash` and POST the same body again with `userOpSignature` and that `userOp`. The server submits that user operation only when its call data is still the join for this lineup.

### 3. leave

Open or cancelled contests. Same request shape as join, with `action` `leave` and the lineup id. The server submits `removePrimaryPosition`. A personal delegate uses the same `preparedUserOp` step.

```json
{
  "chainId": 8453,
  "action": "join",
  "smartWallet": "0x…",
  "contestId": "contest id",
  "lineupId": "lineup id",
  "deadline": "1710000000",
  "signature": "0x…",
  "userOpSignature": "0x…",
  "userOp": {}
}
```

`userOpSignature` and `userOp` are only on the personal delegate's second join or leave. Cut Bot omits both.

Domain:

- name: `Cut Bot`
- version: `1`
- chainId: the contest chain
- verifyingContract: the user's smart wallet

Message:

- `action`: `lineupUpsert`, `join`, or `leave`
- `smartWallet`: the user's smart wallet
- `contestId`: contest id
- `lineupId`: lineup id, or `""` when creating a lineup
- `picksHash`: `keccak256` of the UTF-8 string of `candidates` joined by `|`. `join` and `leave` sign the hash of an empty string. `prediction` is not included
- `callsHash`: the zero hash. These actions do not authorize a custom call list
- `deadline`: unix seconds, at most one hour ahead

`userOpSignature` is the delegate's EIP-191 signature of the raw 32-byte `userOpHash`: `signMessage({ message: { raw: userOpHash } })`. Do not prefix it. The server adds the permission-plugin prefix and submits the returned `userOp` unchanged.

A failed join is logged as `error` and does not create an entry. The log stores the action and the time. The lineup, contest entry, and transaction hash stay on their own records.

## Settings

`GET /api/bot/delegate-address` returns Cut Bot's public address, or `null` when the server key is unset.

A signed-in user records an approval with `POST /api/bot/delegates`. The first approval is the owner's enable signature. Kernel installs the key and grants `execute` on the first `join` or `leave`. Allowing the same key again after a revoke sends an install transaction:

- `kind`: `cut_bot` or `external`
- `delegateAddress`
- `smartWallet`
- `approval`: serialized permission account
- `permissionId`: the 4-byte Kernel permission id

`POST /api/bot/delegates/revoke` with `delegateAddress` records the revoke. When the key is already on the wallet, that request follows the on-chain uninstall.
