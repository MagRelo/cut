# ContestController Contract

## Purpose

On-chain contest escrow plus a per-entry conviction (secondary) market. A trusted `operator` posts outcomes; the chain holds funds and enforces how they move.

## Responsibilities

- Manage contest lifecycle (state machine)
- Handle primary participant deposits and withdrawals
- Implement secondary market pricing and positions (ERC1155)
- Settle winners and distribute primary / secondary payouts
- Route referral-network fees at settlement (or restore to prize pools)
- Support operator push payouts; allocate unallocated dust into winner pools

## Key State Variables

### Immutable Parameters

- `paymentToken` / `paymentTokenDecimals`
- `operator` — trusted escrow agent (lifecycle, settle, cancel, push); not an on-chain truth oracle
- `primaryDepositAmount`
- `referralNetworkBps`
- `expiryTimestamp`
- `primaryDepositSecondarySubsidyBps`
- `referralGraph` / `rewardCalculator` / `referralGroupId`
- `minSecondaryPurchaseAmount`

### Mutable State

- `state`: `OPEN` | `ACTIVE` | `LOCKED` | `SETTLED` | `CANCELLED`
- `entries[]` (capped at `MAX_ENTRIES`)
- `entryOwner`, `primaryPrizePool`, `primaryPrizePoolPayouts`
- `secondaryLiquidityPerEntry`, `secondaryWinningEntry`, `netPosition`

## Lifecycle

```
OPEN → ACTIVE → LOCKED → SETTLED
  ↓      ↓        ↓
CANCELLED
```

After `expiryTimestamp`, the operator has `SETTLEMENT_GRACE_PERIOD` (1 day) to settle while LOCKED. Permissionless `cancelExpired()` unlocks after `expiryTimestamp + SETTLEMENT_GRACE_PERIOD`.

## Key Functions

### Participant

- `addPrimaryPosition` / `removePrimaryPosition` (OPEN)
- `addSecondaryPosition` (ACTIVE) / `removeSecondaryPosition` (OPEN or CANCELLED)
- `claimPrimaryPayout` / `claimSecondaryPayout` (SETTLED)

### Operator (`onlyOperator`)

- `activateContest` — OPEN → ACTIVE
- `lockContest` — ACTIVE → LOCKED
- `settleContest(winningEntries, payoutBps, secondaryWinner)` — LOCKED → SETTLED  
  `secondaryWinner` must be an active entry in `winningEntries`; receives residual secondary pool and anchors referral fees
- `cancelContest` — any non-SETTLED → CANCELLED
- `setPrimaryMerkleRoot` / `setSecondaryMerkleRoot`
- `pushPrimaryPayouts` / `pushSecondaryPayouts` — after SETTLED; then `_allocateUnallocatedBalance` credits dust into winner pools (never transferred to operator)

### Permissionless

- `cancelExpired` — after expiry + grace period, if not SETTLED → CANCELLED

## Referral fee at settle

`referralNetworkBps` is deducted once from gross TVL. Distribution uses ReferralGraph + RewardCalculator. If there is no payable referrer chain or distribution fails, the fee is restored proportionally to primary and secondary pools (`ReferralNetworkFeeToPrimary`).

## Dependencies

- Solady ERC1155 / ReentrancyGuard / SafeTransferLib
- SecondaryPricing library
- ReferralGraph / RewardCalculator (external)
