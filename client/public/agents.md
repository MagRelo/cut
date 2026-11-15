# Agents

Play The Cut has three ways to sign a contest entry.

1. **No delegate.** The logged-in client signs. Nothing in this document applies.
2. **Cut Bot.** The user allows Cut Bot's address in Settings. The server holds that key and can save a lineup, then join or leave, while the user is away.
3. **Personal delegate.** The user pastes a public address and approves the same install. That bot signs with its own key. The server checks the signature and relays it. The private key is never sent to Play The Cut.

Both delegates are a Kernel v3.1 session key on EntryPoint 0.7. The key is a blank check: it can submit any call the wallet can. It is not a second owner. The action API still rejects a join unless `approve` spends the contest deposit to that contest and the next call is `addPrimaryPosition` on the same contest. A key that skips the API is not limited by that check.

Revoke removes the session key on-chain. A database row that still says active cannot keep a removed key working.

## ERC-8128 (Preferred)

The bot API supports [ERC-8128](https://erc8128.slice.so/) — signed HTTP requests with Ethereum per RFC 9421 HTTP Message Signatures. ERC-8128 provides request integrity (method, path, query, body are signed) and replay protection via nonces.

Spec version: `draft-2026-01-16`

### Headers

| Header | Description |
|--------|-------------|
| `Signature-Input` | Covered components and signature parameters |
| `Signature` | Base64-encoded signature bytes |
| `Content-Digest` | SHA-256 digest of the body (POST requests) |

### keyid format

`eip8128:<chainId>:<address>` — e.g. `eip8128:8453:0x1234...`

### Replay protection

- **Write actions** (`lineupUpsert`, `join`, `leave`): MUST include a `nonce` parameter. The server reserves the nonce BEFORE executing the action, rejecting duplicates.
- **Read requests** (`GET /api/bot/contests`): No nonce required; signatures are replayable within their validity window.

### ERC-8128 signing example (viem)

```typescript
import { privateKeyToAccount } from 'viem/accounts'
import { hashMessage, toBytes, keccak256 } from 'viem'

const account = privateKeyToAccount('0x...')
const chainId = 8453
const nowSeconds = Math.floor(Date.now() / 1000)
const ttlSeconds = 60

// Build covered components
const components = ['@method', '@authority', '@path']
const method = 'POST'
const authority = 'api.playthecut.com'
const path = '/api/bot/actions'

const body = JSON.stringify({
  chainId: 8453,
  action: 'lineupUpsert',
  smartWallet: '0x...',
  contestId: 'contest-1',
  lineupId: '',
  candidates: ['ep-1', 'ep-2'],
})

// Add content-digest for POST requests
const bodyHash = keccak256(toBytes(body)).slice(2)
const contentDigest = `sha-256=:${Buffer.from(bodyHash, 'hex').toString('base64')}:`
components.push('content-digest')

// Build Signature-Input
const nonce = crypto.randomUUID() // Generate unique nonce for writes
const keyid = `eip8128:${chainId}:${account.address.toLowerCase()}`
const sigInput = `eth=("${components.join('" "')}");created=${nowSeconds};expires=${nowSeconds + ttlSeconds};nonce="${nonce}";keyid="${keyid}"`

// Build signature base per RFC 9421
const sigBase = [
  `"@method": ${method}`,
  `"@authority": ${authority}`,
  `"@path": ${path}`,
  `"content-digest": ${contentDigest}`,
  `"@signature-params": ${sigInput.slice(4)}`, // Remove "eth=" prefix
].join('\n')

// Sign with ERC-191
const sig = await account.signMessage({ message: { raw: toBytes(sigBase) } })
const sigHeader = `eth=:${Buffer.from(sig.slice(2), 'hex').toString('base64')}:`

// Send request
const response = await fetch('https://api.playthecut.com/api/bot/actions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Digest': contentDigest,
    'Signature-Input': sigInput,
    'Signature': sigHeader,
  },
  body,
})
```

### ERC-8128 action body (no signature field)

When using ERC-8128, omit the `signature` and `deadline` fields from the JSON body:

```json
{
  "chainId": 8453,
  "action": "lineupUpsert",
  "smartWallet": "0x…",
  "contestId": "contest id",
  "lineupId": "",
  "candidates": ["eventParticipantId", "eventParticipantId"]
}
```

## Legacy EIP-712 (Deprecated)

The legacy format embeds the signature in the request body. It remains supported for backward compatibility but is deprecated. Responses include an `X-Deprecation-Warning` header.

## Contests

`GET /api/bot/contests` returns the contests this delegate can enter, each with its field. No Privy session. The request is signed.

### ERC-8128 (preferred)

Sign the request with ERC-8128 headers. The `smartWallet` query parameter is still required. No nonce is needed for reads.

```
GET /api/bot/contests?smartWallet=0x...&eventId=event-1
Signature-Input: eth=("@method" "@authority" "@path" "@query");created=...;expires=...;keyid="eip8128:8453:0x..."
Signature: eth=:base64sig:
```

### Legacy EIP-712 (deprecated)

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

### ERC-8128 (preferred)

Sign the request with ERC-8128 headers including a nonce. Write actions MUST include a nonce for replay protection.

### Body format

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

### Legacy EIP-712 signature (deprecated)

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
