# Referral network (on-chain)

Contest **referral network fees** (typically 5% of gross TVL at settlement, `referralNetworkBps = 500`) are deducted once during `settleContest`. `ContestController` resolves the winning entry owner's referrer chain via `ReferralGraph` + `RewardCalculator` and transfers the fee from contest balance, or restores unallocated fee proportionally to the primary and secondary prize pools when no payable referrer exists.

Contract design: [`contracts/lib/contestCatalyst/docs/ReferralNetworkIntegration.md`](../../contracts/lib/contestCatalyst/docs/ReferralNetworkIntegration.md). Cron: [`spec/server/cron.md`](../../spec/server/cron.md).

---

## Tree policy

The **cold referral platform root** (`REFERRAL_PLATFORM_ROOT_ADDRESS` / `VITE_REFERRAL_PLATFORM_ROOT_ADDRESS`) registers once under `REFERRAL_ROOT` (`0x0000000000000000000000000000000000000001`). It is **not** a contest role. The hot **OPS_ORACLE** signs `register` / `batchRegister` and acts as ContestFactory `operator`, but is **not** a graph ancestor. Every user with a wallet on the contest chain is on the graph:

| User | DB `referrerAddress` | On-chain parent |
|------|----------------------|-----------------|
| Referral platform root | `null` | `REFERRAL_ROOT` |
| Organic (no invite) | `null` | Platform root address |
| Invited | Inviter wallet | Inviter (must already be on-chain) |

**Settlement:** `getReferrer(winner, groupId)` must be non-zero and not `REFERRAL_ROOT` for a payable chain. The server blocks settle if the winner is not `isRegistered` when `referralNetworkBps > 0`. The contest calls `getPayoutChain(payoutAnchor, groupId, 10)` and `RewardCalculator.calculateRewards`, then transfers each share (geometric split; the winner is never a fee recipient). The platform root is always an ancestor for organics in this model.

**Settlement events:**

| Event | Meaning |
|-------|---------|
| `ReferralNetworkFeeDistributed` | Wallet transfer to a referrer in the payout chain (indexed as `OnchainPayment` kind `REFERRAL`) |
| `ReferralNetworkFeeToPrimary` | Unallocated referral fee restored to prize pools — not a wallet payment |
| `UnallocatedBalanceAllocated` | Push-batch dust credited into winner pools — not a referral fee |

`ReferralNetworkFeeToPrimary` is the contract safety net for an unregistered winner / empty chain and must not occur in normal operation.

```mermaid
flowchart TB
  ROOT[REFERRAL_ROOT]
  PlatformRoot[Referral platform root]
  Organic[Organic user]
  Invited[Invited user]
  Settle[settleContest]
  Fee[ReferralNetworkFeeDistributed]

  ROOT --> PlatformRoot
  PlatformRoot --> Organic
  Invited -->|"referrer on-chain"| Invited
  Settle --> Fee
  Fee --> PlatformRoot
```

---

## Fees

```text
referralFee = totalGross * referralNetworkBps / 10_000
netPools    = gross * (1 - referralNetworkBps / 10_000)
```

| Winner tree | Who receives `referralFee` |
|-------------|----------------------------|
| `PlatformRoot → Winner` | Platform root only (~100% via calculator) |
| `PlatformRoot → Alice → Winner` | Alice + platform root (geometric decay) |
| Deeper invite chains | Referrers + platform-root ancestor slice |

Indexing: `OnchainPayment` rows with type `REFERRAL` ([`recordSettlementReferralPayments.ts`](../../server/src/services/contest/recordSettlementReferralPayments.ts)). Results UI: `GET /contests/:id` → `onchainPayments`.

---

## Contract addresses

Read from `server/src/contracts/{sepolia,base}.json` and `client/src/utils/contracts/{sepolia,base}.json`. ContestFactory holds `referralGraph`, `rewardCalculator`, and `referralGroupId` as immutables; every contest inherits them.

---

## Deploy graph (new environment or redeploy)

Minimal Sepolia redeploy (keeps existing MockUSDC):

```bash
# contracts/.env: DEPLOYER_PK, OPS_ORACLE_PK, BASE_SEPOLIA_RPC_URL, REFERRAL_GROUP_ID,
# PAYMENT_TOKEN_ADDRESS, REFERRAL_GRAPH_ADDRESS, REWARD_CALCULATOR_ADDRESS (factory-only)
pnpm run sepolia:deploy-referral
pnpm run sepolia:deploy-contest-factory
```

Patch `referralGraphAddress`, `rewardCalculatorAddress`, and `contestFactoryAddress` in both `sepolia.json` files (leave `paymentTokenAddress` unchanged). Then `pnpm run deploy:copy-artifacts`.

`ReferralGraph` authorizes the hot OPS address per `REFERRAL_GROUP_ID`. `RewardCalculator` is stateless. Settlement: operator calls `settleContest(winningEntries, payoutBps, secondaryWinner)`.

---

## Bootstrap and steady state

### Environment (`server/.env`)

| Variable | Purpose |
|----------|---------|
| `REFERRAL_GROUP_ID` | `bytes32` — same on graph and factory |
| `REFERRAL_PLATFORM_ROOT_ADDRESS` | Cold address-only organic parent under `REFERRAL_ROOT`; receives its referral share |
| `OPS_ORACLE_PK` | Signs `register` / `batchRegister` and contest operator txs |
| `OPS_ORACLE_ADDRESS` | Optional; pins the OPS address instead of deriving from `OPS_ORACLE_PK` |
| `REFERRAL_SYNC_CHAIN_ID` | Optional; scripts default `84532` |

Client: `VITE_REFERRAL_PLATFORM_ROOT_ADDRESS` must match server `REFERRAL_PLATFORM_ROOT_ADDRESS`. No platform-root private key is accepted by web or cron.

### After deploy

Canonical rebuild (Sepolia or Base — set `REFERRAL_SYNC_CHAIN_ID` to `84532` or `8453`):

```bash
pnpm --filter server run script:rematerialize-referral-graph --dry-run
pnpm --filter server run script:rematerialize-referral-graph --reset-hashes
```

| Script | Role |
|--------|------|
| `rematerializeReferralGraph.ts` | Phase 0 optional hash reset → platform root → organics → invite waves → parent audit |
| `bootstrapReferralRoot.ts` | Thin helper: `register(referralRoot, REFERRAL_ROOT, groupId)` |
| `registerUsersUnderReferralRoot.ts` | Organics only (`referredByUserId` and `referrerAddress` null) |
| `batchSyncReferralGraph.ts` | Ongoing cron: pending `referralOnchainTxHash: null`; fails on parent mismatch |

Setup services expose `referralRoot` (the platform-root address).

**Do not** register invited users under the referral root as “missing parents.” ReferralGraph cannot re-parent.

---

## Relevant files

| Concern | Path |
|---------|------|
| Referral config | `server/src/lib/referralConfig.ts` |
| Platform root env | `server/src/lib/referralPlatformRoot.ts` |
| Graph setup / rematerialize | `server/src/services/referral/` |
| Settlement indexing | `server/src/services/contest/recordSettlementReferralPayments.ts` |

### Checklist

- [ ] `REFERRAL_PLATFORM_ROOT_ADDRESS` set and bootstrapped under `REFERRAL_ROOT`
- [ ] `REFERRAL_GROUP_ID` matches factory + graph
- [ ] OPS authorized as ReferralGraph oracle for the group
- [ ] Organics rematerialized under platform root
