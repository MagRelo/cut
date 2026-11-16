# Agents

An agent uses Play The Cut through the bot API (`/api/bot/*`) on the site's origin, for example `https://playthecut.com/api/bot/actions`.

There is one way to authenticate: **ERC-8128 signed HTTP requests**. There are no API keys, cookies, or Privy sessions. Each request is signed with an Ethereum key, and the signature covers the method, host, path, query, and body.

## The flow

1. **Create a key.** The agent generates a private key and keeps it. That key owns the account.
2. **Register.** `register`, signed with the key, with an optional `refCode`. The server returns the account's smart wallet address. Nothing else is needed: no email, browser, or delegate.
3. **Fund.** Send USDC (Base) to the smart wallet. Contest deposits come from it.
4. **Read.** `GET /api/bot/balance` and `GET /api/bot/contests`. No nonce.
5. **Play.** `lineupUpsert`, then `join` (and `leave`). Each write has a fresh nonce.
6. **Optional: add a delegate.** The owner key can allow a second key (a Kernel session key limited to entering and leaving contests) with `delegateAdd`, and remove it with `delegateRevoke`.

A runnable version of this flow is [`server/scripts/erc8128-client-example.ts`](https://github.com/MagRelo/cut/blob/main/server/scripts/erc8128-client-example.ts).

## The account

The account is a ZeroDev **Kernel v3.1** smart wallet on **EntryPoint 0.7**. Its sudo validator is the ZeroDev ECDSA validator (`0x845ADb2C711129d4f3966735eD98a9F09fC4cE57`), and its owner is the key the agent created. The address is counterfactual (CREATE2, index 0), so it exists before anything is deployed and is the same on Base and Base Sepolia. The wallet deploys with its first user operation, usually the first `join`.

Web users have the same kind of wallet; their owner is the Privy embedded wallet. The bot API treats both alike.

## Signers

A request for a smart wallet can be signed by:

- **The owner key.** The server checks ownership on-chain once the wallet is deployed (the owner the ECDSA validator stores for it), and by the counterfactual address before that. The owner can do everything.
- **An active delegate.** A Kernel permission session key the owner allowed: Cut Bot (`kind: "cut_bot"`, the server holds its key) or any other key (`kind: "external"`). A delegate can read, update settings, save lineups, join, and leave. It cannot add delegates, and can revoke only itself.

### What a delegate can do on-chain

A delegate's key is limited on-chain by the policies the owner signs, not only by this API. The server accepts exactly one grant (see `delegateAdd`):

- **Can:** call `approve(spender, amount)` on the payment token where `spender` is one of the granted contests; call `addPrimaryPosition` (join) and `removePrimaryPosition` (leave) on those contests. Plain calls only, no ETH value. Several of these in one batch are checked one by one.
- **Cannot:** call the wallet itself, so it cannot add delegates, change the owner, or upgrade the wallet; transfer tokens or approve any other spender; delegatecall; send ETH; sign messages for the wallet (ERC-1271, so no `permit`); touch contests it was not granted.

Contests are separate contracts, and the policy names exact addresses, so a grant lists the contests it covers (at most 10, from `GET /api/bot/delegate-policy`). A contest created later needs a new grant: the owner calls `delegateAdd` again. Until then the API answers `403` for a delegate join on an ungranted contest.

Off-chain, through this API, a delegate can also read, update settings, and save lineups.

## ERC-8128 signing

Spec: [ERC-8128](https://erc8128.slice.so/) draft `2026-01-16`, built on RFC 9421 (HTTP Message Signatures) and RFC 9530 (`Content-Digest`).

Headers:

| Header            | Value                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Signature-Input` | `eth=("@method" "@authority" "@path" ["@query"] ["content-digest"]);created=<unix>;expires=<unix>[;nonce="<nonce>"];keyid="eip8128:<chainId>:<address>"` |
| `Signature`       | `eth=:<base64 of the 65-byte signature>:`                                                                                                                |
| `Content-Digest`  | `sha-256=:<base64 SHA-256 of the exact body bytes>:` (requests with a body)                                                                              |

Rules the server enforces:

- Covered components must include `@method`, `@authority` (the `Host` you send to), and `@path`; also `@query` when the URL has a query, and `content-digest` when there is a body. The digest must match the body.
- `keyid` is `eip8128:<chainId>:<lowercase address>`. `chainId` is `8453` (Base) or `84532` (Base Sepolia) and selects the chain for the request. A write's body `chainId` must match it.
- `expires - created` is at most 3600 seconds, and the request must arrive inside that window.
- The signature is ERC-191 (`personal_sign`) over the RFC 9421 signature base, by the `keyid` address.
- **Writes require `nonce`** (8 to 128 URL-safe characters, unique per signer). The server records `(signer, nonce)` before doing anything, so a replayed or concurrent duplicate gets `409`. Use a new nonce for every write, including the second half of a join. **Reads take no nonce.**

The signature base, one line per covered component, then the parameters:

```
"@method": POST
"@authority": playthecut.com
"@path": /api/bot/actions
"content-digest": sha-256=:X48E9qOokqqrvdts8nOJRJN3OWDUoyWxBf7kbu9DBPE=:
"@signature-params": ("@method" "@authority" "@path" "content-digest");created=1763245000;expires=1763245060;nonce="q1w2e3r4t5y6u7i8";keyid="eip8128:8453:0xabc…"
```

viem example:

```ts
import { createHash, randomBytes } from "node:crypto";
import { toBytes } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const key = generatePrivateKey(); // keep this
const account = privateKeyToAccount(key);
const chainId = 8453;

async function signedFetch(method: "GET" | "POST", url: URL, body?: unknown) {
  const now = Math.floor(Date.now() / 1000);
  const text = body === undefined ? undefined : JSON.stringify(body);
  const components = ["@method", "@authority", "@path"];
  const values: Record<string, string> = {
    "@method": method,
    "@authority": url.host,
    "@path": url.pathname,
  };
  const headers: Record<string, string> = {};
  if (url.search) {
    components.push("@query");
    values["@query"] = url.search;
  }
  if (text !== undefined) {
    const digest = `sha-256=:${createHash("sha256").update(text).digest("base64")}:`;
    components.push("content-digest");
    values["content-digest"] = digest;
    headers["content-digest"] = digest;
    headers["content-type"] = "application/json";
  }
  const nonce = method === "POST" ? `;nonce="${randomBytes(16).toString("base64url")}"` : "";
  const keyid = `eip8128:${chainId}:${account.address.toLowerCase()}`;
  const params = `(${components.map((c) => `"${c}"`).join(" ")});created=${now};expires=${now + 60}${nonce};keyid="${keyid}"`;
  const base = [
    ...components.map((c) => `"${c}": ${values[c]}`),
    `"@signature-params": ${params}`,
  ].join("\n");
  const sig = await account.signMessage({ message: { raw: toBytes(base) } });
  headers["signature-input"] = `eth=${params}`;
  headers["signature"] = `eth=:${Buffer.from(sig.slice(2), "hex").toString("base64")}:`;
  return fetch(url, { method, headers, body: text });
}
```

## Writes: `POST /api/bot/actions`

One signed request does one thing. The JSON body names the `action`. Unknown fields are rejected.

### register

Signed by the new key. Creates the Cut account for the key's smart wallet.

```json
{
  "action": "register",
  "chainId": 8453,
  "refCode": "AbCdEfGh",
  "name": "Ace",
  "settings": { "oddsFormat": "decimal" }
}
```

`refCode`, `name`, and `settings` are optional. `refCode` is another user's 8-character referral code. The referrer is attached to the account and the account is registered on the ReferralGraph under that referrer by the referral sync job (`referral.onchain` is `pending` until then). Without a `refCode` the account is registered under the platform root when the platform referral group is configured, as web signup does.

Response `201` (created) or `200` (already registered):

```json
{
  "created": true,
  "userId": "…",
  "name": "Ace",
  "smartWallet": "0x…",
  "owner": "0x…",
  "chainId": 8453,
  "referralCode": "XyZ23456",
  "referral": { "applied": true, "referrerAddress": "0x…", "onchain": "pending" }
}
```

`register` is idempotent. The same key always maps to the same wallet; a repeat returns the existing account and never changes its referrer (`refCodeIgnored: true` if a code was sent). Errors: `400` with `code` `INVALID_REF_CODE`, `UNKNOWN_REF_CODE`, `SELF_REFERRAL`, or `REFERRER_HAS_NO_WALLET`; `401` for a bad signature; `409` for a reused nonce; `429` when rate limited (per IP and per key).

`referralCode` is the new account's own code to share.

### userSettingsUpsert

Owner or delegate. Sets the display name and/or the settings the app's Settings page edits. Merges; repeating it changes nothing.

```json
{
  "action": "userSettingsUpsert",
  "chainId": 8453,
  "smartWallet": "0x…",
  "name": "Ace",
  "settings": { "color": "#1e90ff", "oddsFormat": "american", "onboardingDismissed": true }
}
```

`oddsFormat` is `american`, `decimal`, or `english`. `color` is a hex color. Response: `{ "ok": true, "name": "Ace", "settings": { … } }`.

### lineupUpsert

Creates a lineup when `lineupId` is `""` (or omitted) and updates that lineup when it is set. The same picks for the same contest return the existing id. No transaction.

```json
{
  "action": "lineupUpsert",
  "chainId": 8453,
  "smartWallet": "0x…",
  "contestId": "contest id",
  "lineupId": "",
  "candidates": ["eventParticipantId", "eventParticipantId"],
  "prediction": { "type": "winningLineupTotal", "value": 142 }
}
```

`candidates` is the ordered list of `eventParticipantId`s from `GET /api/bot/contests`. `prediction` is optional; without it the server picks a random value in the sport's range (for golf, the winning-score tiebreaker). Response: `{ "ok": true, "lineupId": "…" }`.

### join and leave

`join` needs an open contest and the `lineupId` from `lineupUpsert`. The server builds `approve` of the contest deposit to the contest, then `addPrimaryPosition` for that lineup. `leave` (open or cancelled contests) builds `removePrimaryPosition`.

```json
{
  "action": "join",
  "chainId": 8453,
  "smartWallet": "0x…",
  "contestId": "contest id",
  "lineupId": "lineup id"
}
```

- **Cut Bot** signs and submits the user operation itself. Response: `{ "ok": true, "lineupId": "…" }`.
- **The owner key or an external delegate** signs the user operation in two requests:
  1. Send the body above. Response: `{ "preparedUserOp": true, "lineupId", "userOpHash", "userOp" }`.
  2. Sign the raw 32-byte hash, `account.signMessage({ message: { raw: userOpHash } })` (EIP-191, no other prefix), and send the same body again with `userOpSignature` and the unchanged `userOp`, under a new nonce. The server submits it only if its call data is still this join or leave. Response: `{ "ok": true, "lineupId": "…" }`.

The first user operation of a new wallet also deploys it. A failed user operation does not create or remove the entry.

### delegateAdd and delegateRevoke

Owner only (a delegate may revoke itself).

```json
{
  "action": "delegateAdd",
  "chainId": 8453,
  "smartWallet": "0x…",
  "kind": "external",
  "delegateAddress": "0x…",
  "approval": "<serialized Kernel permission account>",
  "permissionId": "0x1234abcd"
}
```

`approval` is the ZeroDev `serializePermissionAccount` output (`@zerodev/permissions` 5.6.x) for a permission validator whose ECDSA signer is the delegate, with exactly these two policies in this order, signed by the owner (the enable signature):

1. **CallPolicy `0.0.5`** (`0x85770b902D1e503D5f5141d9eaC16d0d08eEaDd2`), flag `0x0000`. Permissions, all `callType` CALL (`0x00`) and `valueLimit` 0, with the contest addresses sorted by lowercase address:
   - target the payment token, selector `0x095ea7b3` (`approve(address,uint256)`), one rule: `ONE_OF` at offset 0 with each contest address left-padded to 32 bytes
   - for each contest: target the contest, selector `0xe1db226a` (`addPrimaryPosition(uint256,bytes32[])`), no rules
   - for each contest: target the contest, selector `0x7e8f1234` (`removePrimaryPosition(uint256)`), no rules
2. **SignatureCallerPolicy** (`0xF6A936c88D97E6fad13b98d2FD731Ff17eeD591d`), flag `0x0000`, `allowedCallers: []`.

Get the payment token and the open contests from `GET /api/bot/delegate-policy?chainId=…`; any subset of Cut's contests on that chain (1 to 10) is accepted. The server rebuilds the policies from the grant and rejects anything else: a sudo policy, extra policies or permissions, an approve without the spender rule, a contest Cut does not know, another wallet, or a `permissionId` that does not match. Kernel installs the key with its first `join` or `leave`. `permissionId` is the validator's 4-byte id; it depends on the grant, so each grant is a new key slot. `kind` is `cut_bot` only for Cut Bot's address (`GET /api/bot/delegate-address`). The example script builds both. The response lists the granted contests. Calling `delegateAdd` again for the same delegate replaces its grant in the API; the earlier permission stays installed on-chain (still limited to its own contests) until the owner uninstalls it with `uninstallValidation`, which the web app does for you.

```json
{ "action": "delegateRevoke", "chainId": 8453, "smartWallet": "0x…", "delegateAddress": "0x…" }
```

Revoke stops the API from accepting the key at once. Removing the key on-chain is a separate wallet call (`uninstallValidation`), which the web app sends when you revoke there.

## Reads (no nonce)

### GET /api/bot/balance?smartWallet=0x…

Owner or delegate. The wallet's contest payment-token balance (USDC on Base, test USDC on Base Sepolia), the balance the app shows.

```json
{
  "chainId": 8453,
  "smartWallet": "0x…",
  "deployed": false,
  "paymentToken": {
    "address": "0x…",
    "symbol": "USDC",
    "decimals": 6,
    "balance": "12500000",
    "formatted": "12.5"
  }
}
```

### GET /api/bot/contests?smartWallet=0x…[&eventId=…]

Owner or delegate. Contests on the keyid chain that this account can see: public contests plus contests in its leagues. Contests on the same event share one candidate pool.

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
          "eventParticipantId": "id for lineupUpsert",
          "participantId": "stable id",
          "displayName": "Name",
          "sortKeys": {},
          "metadata": {}
        }
      ]
    }
  ]
}
```

### GET /api/bot/delegate-address

Unsigned. Cut Bot's public address, or `null` when the server key is unset.

### GET /api/bot/delegate-policy?chainId=8453

Unsigned. What a delegate grant needs: the payment token, open contests on that chain (soonest end first, at most 10), and the policy contracts.

```json
{
  "chainId": 8453,
  "paymentToken": "0x…",
  "contests": ["0x…"],
  "maxContests": 10,
  "callPolicy": { "version": "0.0.5", "address": "0x85770b902D1e503D5f5141d9eaC16d0d08eEaDd2" },
  "signaturePolicy": { "address": "0xF6A936c88D97E6fad13b98d2FD731Ff17eeD591d", "allowedCallers": [] }
}
```

## Errors

`400` bad body or parameters, `401` missing or invalid signature, `403` signer is not the owner or an active delegate (or the action is owner-only, or the contest is outside the delegate's grant), `404` unknown contest or unregistered wallet, `409` reused nonce or contest not open, `429` rate limited, `502` user operation failed.

## Web app

Signed-in users manage delegates from Settings. Those screens use the app's own session routes (`/api/bot/delegates`), which are not part of the agent API.
