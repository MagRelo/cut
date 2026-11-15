# Agents

Play The Cut has three ways to sign a contest entry.

1. **No delegate.** The logged-in client signs. Nothing in this document applies.
2. **Cut Bot.** The user allows Cut Bot's address in Settings. The server holds that key and can `join`, `leave`, and `update` while the user is away.
3. **Personal delegate.** The user pastes a public address and approves the same install. That bot signs with its own key. The server checks the signature and relays it. The private key is never sent to Play The Cut.

Both delegates are a Kernel v3.1 session key on EntryPoint 0.7. The key is a blank check: it can submit any call the wallet can. It is not a second owner. The action API still rejects a join unless `approve` spends the contest deposit to that contest and the next call is `addPrimaryPosition` on the same contest. A key that skips the API is not limited by that check.

Revoke removes the session key on-chain. A database row that still says active cannot keep a removed key working.

## Field

`GET /api/bot/contests/:contestId/candidates` returns the contest field. No Privy session.

```json
{
  "contestId": "contest id",
  "eventId": "event id",
  "candidates": [
    {
      "eventParticipantId": "id sent back in the signed request",
      "participantId": "stable participant id",
      "displayName": "Name",
      "sortKeys": {},
      "metadata": {}
    }
  ]
}
```

The same pool is `GET /api/sports/:sportId/events/:eventId/candidates`.

## POST /api/bot/actions

No Privy session. The body is an EIP-712 `BotAction` signature from the delegate key, plus the candidate ids the agent chose from the field.

`candidates` is an ordered array of `eventParticipantId` values. Order is the lineup order. `join` and `update` send the chosen lineup. `leave` may send an empty array.

```json
{
  "chainId": 84532,
  "action": "join",
  "smartWallet": "0x…",
  "contestId": "contest id",
  "lineupId": "",
  "candidates": ["eventParticipantId", "eventParticipantId"],
  "callsHash": "0x…",
  "deadline": "1710000000",
  "signature": "0x…",
  "userOpSignature": "0x…"
}
```

`userOpSignature` is required for a personal delegate on `join` and `leave`. Cut Bot omits it.

Domain:

- name: `Cut Bot`
- version: `1`
- chainId: the contest chain
- verifyingContract: the user's smart wallet

Message:

- `action`: `join`, `leave`, or `update`
- `smartWallet`: the user's smart wallet
- `contestId`: contest id
- `lineupId`: lineup id, or `""` on a prepare request
- `picksHash`: `keccak256` of the UTF-8 string of `candidates` joined by `|`
- `callsHash`: `keccak256` of the canonical calls, or the hash of an empty call list to prepare
- `deadline`: unix seconds, at most one hour ahead

`update` uses the zero hash for `callsHash`. It replaces the lineup with `candidates` and does not send a transaction.

`join` is open contests only. It writes the lineup from `candidates` and submits `approve` plus `addPrimaryPosition`. `leave` is open or cancelled contests. It submits `removePrimaryPosition` and removes the entry.

A prepare request signs `lineupId: ""` and the empty-calls hash. The response is `{ prepared: true, lineupId, callsHash, calls }`. Sign again with that `lineupId` and `callsHash`, then POST. A personal delegate also sends `userOpSignature` for `join` and `leave`. Cut Bot signs that user operation on the server.

A failed join is logged as `error` and does not create a second entry. The log stores the action and the time. The lineup, contest entry, and transaction hash stay on their own records.

## Settings

`GET /api/bot/delegate-address` returns Cut Bot's public address, or `null` when the server key is unset.

A signed-in user records an install with `POST /api/bot/delegates` after the session-key transaction:

- `kind`: `cut_bot` or `external`
- `delegateAddress`
- `smartWallet`
- `approval`: serialized permission account
- `permissionId`: the 4-byte Kernel permission id

`POST /api/bot/delegates/revoke` with `delegateAddress` records the revoke after the on-chain uninstall.
