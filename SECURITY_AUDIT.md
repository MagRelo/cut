# Security audit

Play The Cut v4 — server + client pass focused on Privy wallets, OPS_ORACLE on-chain payouts, and remaining authz / input gaps.

**Last updated:** 2026-08-17  
**Resume here:** work the open findings below in suggested order. The canvas at `.cursor/projects/.../canvases/security-hardening-audit.canvas.tsx` mirrors this list (open it beside chat to filter by severity).

---

## Fixed (do not re-open)

| Item | Severity | Commit / location | Effect |
|------|----------|-------------------|--------|
| Factory-verify contest registration | Critical | `04efbc5` — `verifyFactoryContestCreation.ts`, `POST /api/contests` | Requires factory `ContestCreated` receipt; pins `operator` and `paymentToken` from chain/config |
| Static path containment | Medium | `80c728a` — `resolvePublicStaticFile.ts`, `app.ts` | `realpath` containment inside `public/`; no dotfiles or traversal; `@hono/node-server` `serveStatic` |
| API body size cap | — | `24173dc5` — `server/src/routes/api.ts` | 128KB JSON limit on `/api/*` |
| Join ownership | — | `24173dc5` — `verifyPrimaryEntryOwner.ts` | Join requires on-chain `entryOwner ==` session wallet |
| Secondary buy receipts | — | `24173dc5` — `verifySecondaryBuyReceipt.ts` | Receipt must emit `SecondaryPositionAdded` for contest/wallet/entry |
| User settings schema | — | `24173dc5` — `server/src/schemas/user.ts` | Strict Zod; cannot smuggle `userType` via settings JSON |
| Admin list query | — | `24173dc5` — `server/src/routes/admin.ts` | `userType` query allowlisted before `$queryRaw` |
| Lean auth / provisioning | Medium | `privyUserProvisioning.ts`, `middleware/auth.ts`, `routes/auth.ts` | Read-only middleware; `POST /auth/session` for signup/sync; lean `GET /auth/me`; wallet conflicts → 409 |

**Explicitly out of scope** (skipped during factory-verify work): unique `(chainId, address)` on `Contest`, lifecycle origin checks on existing rows.

---

## Open findings

Counts: **0 Critical** · **3 High** · **4 Medium** · **2 Low**

### High

#### 1. Side-bet tickets book without verifying on-chain payment

| | |
|---|---|
| **Location** | `server/src/routes/bets.ts:226` |
| **Area** | API authz |

`POST /api/bets/side/tickets` creates an OPEN ticket from `stakeAmount` alone. `transactionHashes` is optional and unused on the success path. `fundingTxHash` is only written on the REFUND_PENDING fallback. Stake recipient exists only as `VITE_SIDE_BET_STAKE_RECIPIENT` in the client.

**Exploit.** Skip the wallet transfer and POST a ticket. Admin settle grades it as real liability. A WON ticket becomes money the house owes with no matching USDC inflow.

**Fix.** Require a tx hash, verify `Transfer` to the configured treasury for the exact stake from the caller wallet, and store `fundingTxHash` uniquely before OPEN.

---

#### 2. Sponsored Privy txs are not allowlisted

| | |
|---|---|
| **Location** | `client/src/hooks/useBlockchainTransaction.ts:144` |
| **Area** | Privy / wallet |

Smart-wallet `sendTransaction` and embedded-wallet `sendTransaction({ sponsor: true })` fire whatever calls the UI builds: contest joins, side-bet transfers, and Account Send to an arbitrary address. Paymaster policy id is optional env.

**Exploit.** If the Pimlico/Privy policy is open or unset, an attacker loops dust transfers and drains gas sponsorship. Account Send is a user-chosen recipient, so a policy that allows ERC-20 transfer is enough.

**Fix.** Restrict the sponsorship policy to ContestFactory, ContestController clones, and the payment token as spender/target. Do not sponsor arbitrary transfer. Fail closed if the policy id is missing in production.

---

#### 3. Hot OPS_ORACLE key signs any stored contest address

| | |
|---|---|
| **Location** | `server/src/services/shared/contractClient.ts:14` |
| **Area** | On-chain / operator |

`getWalletClient()` loads `OPS_ORACLE_PK` on the web server and cron. activate/lock/settle/push/referral register all use it. No per-tx allowlist, simulation gate, or value cap. Compromising the app host is full contest + referral-oracle control.

**Exploit.** Server RCE or leaked env lets the attacker settle factory contests to chosen `entryIds` and push payouts, or `batchRegister` a poisoned referral tree. Contest escrow moves on-chain; this is not a DB-only issue.

**Fix.** Keep the key off the public web process. Sign only factory-verified controllers. Simulate and check destination before broadcast. Longer-term: dedicated signer, settle allowlist, or timelocked ops multisig.

---

### Medium

#### 4. No API rate limiting

| | |
|---|---|
| **Location** | `server/src/routes/api.ts:17` |
| **Area** | HTTP / ops |

Body size is capped at 128KB, but there is no per-IP or per-user rate limit. Authenticated routes still verify a Privy JWT on every request.

**Exploit.** Credential stuffing / token replay burns Privy quota and DB. Unauthenticated brute force of 8-char league invite codes. Authenticated spam of contest/lineup writes.

**Fix.** Rate-limit auth, join, contest create, and side-bet place. Cache Privy user lookups briefly. Lock invite-code attempts.

---

#### 5. CORS falls back to localhost with credentials

| | |
|---|---|
| **Location** | `server/src/app.ts:79` |
| **Area** | HTTP / ops |

If `ALLOWED_ORIGINS` is unset in production, origin is `localhost:5173` and `localhost:3000` with `credentials: true`. No CSP, HSTS, `frame-ancestors`, or referrer-policy headers.

**Exploit.** A missed env on a public host is a cross-origin API. Missing `frame-ancestors` allows clickjacking the SPA (wallet connect / send).

**Fix.** Fail startup in production if `ALLOWED_ORIGINS` is missing or includes localhost. Add `hono/secure-headers` (CSP, HSTS, X-Frame-Options).

---

### Medium

#### 6. Operator txs default to public Base RPC

| | |
|---|---|
| **Location** | `server/src/lib/chainConfig.ts:9` |
| **Area** | On-chain / operator |

`BASE_RPC_URL` / `BASE_SEPOLIA_RPC_URL` fall back to public endpoints. Receipt waits and `operator()` reads for settle/push use that transport.

**Exploit.** Public RPC rate limits stall settlement. A compromised or lying RPC can delay or confuse receipt confirmation used to mark SETTLED and insert payout rows (on-chain still rules, DB can desync).

**Fix.** Require an authenticated RPC in production. Do not mark SETTLED until a second independent read confirms state.

---

#### 7. Secondary buy replay is last-hash only

| | |
|---|---|
| **Location** | `server/src/routes/contest.ts:265` |
| **Area** | On-chain / operator |

Replay detection compares only `lastTransactionHash`. `amountWei` is incremented from verified logs. Push payouts use on-chain `balanceOf`, so stolen prizes are unlikely, but the participant table and displayed deposits can be inflated. Concurrent posts of the same new hash can double-count.

**Exploit.** After buys txA then txB, replay txA to inflate `amountWei`. Two parallel requests with a new hash both pass the last-hash check.

**Fix.** Unique used-hash table per contest. Increment `amountWei` only for hashes not yet recorded. Keep push payouts on `balanceOf` (already correct).

---

### Low

#### 9. Lineup picks array has no max length in Zod

| | |
|---|---|
| **Location** | `server/src/schemas/lineup.ts:13` |
| **Area** | API authz |

`lineupWriteBodySchema` accepts any array of strings up to the 128KB body cap. Sport roster validation rejects invalid rosters afterward, but only after parsing.

**Exploit.** Authenticated users send tens of thousands of pick ids per request to burn DB/validation time.

**Fix.** Cap picks to the sport roster size (e.g. max 8) in the schema.

---

#### 10. Debug routes and open PostHog autocapture ship in production builds

| | |
|---|---|
| **Location** | `client/src/App.tsx:223` |
| **Area** | HTTP / ops |

`/debug` and `/dev/*` are registered for all builds. PostHog `identify()` sends email; autocapture is on. `GET /api/cron/status` is unauthenticated. `AdminRoute` renders children while auth is still loading.

**Exploit.** Information disclosure (wallet, email, userType, cron layout). Brief admin-UI flash before redirect. Analytics PII in DOM events.

**Fix.** Gate debug routes on DEV. Tighten PostHog (no autocapture of inputs). Require auth or a shared secret for cron status. Do not render admin children until `userType` is known.

---

## What is already sound

- activate / lock / settle / cancel call `verifyOperator()` before writing
- Join requires on-chain `entryOwner` to match the Privy session wallet
- Push payouts credit from `PrimaryPayoutClaimed` / `SecondaryPayoutClaimed` logs, not client amounts; secondary push filters `balanceOf == 0`
- Test mint is gated to Base Sepolia and `ENABLE_TOKEN_MINTING`
- Users can still self-claim secondary payouts if a push batch fails mid-way
- Contest registration now requires factory `ContestCreated` and pins operator/token from chain
- Auth middleware is read-only (JWT + DB); signup/sync is `POST /auth/session` only; session wallet comes from DB primary `UserWallet`

## What still trusts the operator host

- `settleContest(winningEntries, payoutBps, …)` is computed from DB scores — a poisoned host can crown any factory-contest entry that exists on-chain
- `getContestContract(address)` signs whatever address is in Postgres (factory clones only at create time; no lifecycle re-check)
- Side-bet stake in/out is off-contract; grading is admin; payout is manual — unverified tickets become fake liability
- Default RPC is the public Base endpoint unless env overrides

---

## Suggested order (remaining)

| # | Work | Why |
|---|------|-----|
| 1 | Verify side-bet funding txs before OPEN | Stops unfunded tickets becoming graded liability |
| 2 | Allowlist paymaster destinations; require policy id in prod | Stops gas-sponsorship drain via Send / arbitrary calls |
| 3 | Keep `OPS_ORACLE_PK` off the public web process; simulate + allowlist | Shrinks blast radius if the API host is compromised |
| 4 | Rate limits, production CORS fail-closed, security headers | Stops quota burn, invite brute force, clickjacking |
| 5 | Secondary buy used-hash table | Stops inflated participant deposits in DB/UI |
| 6 | Authenticated RPC in production | Reliable settle/push and fewer DB desyncs |
| 7 | Lineup picks max length; debug route gating; PostHog tightening | Defense in depth / info disclosure |

---

## Reference

- On-chain: `OPS_ORACLE_PK` is contest operator and ReferralGraph oracle — must never be the referral tree root
- Admin APIs: gated by `userType` ADMIN / SUPER_ADMIN after Privy auth
- No production secrets were read during the original audit
