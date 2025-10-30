# Contest Smart Contract - Technical Reference

Complete technical documentation for the unified Contest smart contract (Competition + Prediction Market).

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Token Flow](#token-flow)
- [Accounting Model](#accounting-model)
- [API Reference](#api-reference)
- [State Machine](#state-machine)
- [Testing](#testing)

## Overview

The Contest contract combines two layers in a single contract:

**Layer 1 (Contestants):** Competitors deposit tokens to enter, oracle determines winners, winners claim prizes based on performance.

**Layer 2 (Spectators):** Spectators predict on contestants using LMSR pricing, hold ERC1155 tokens representing their positions, and claim winnings if they predicted the winner.

**Key Design Principle:** Settlement is pure accounting. All fees are deducted at deposit time. Users claim via pull-based functions.

## Core Concepts

### Oracle Fee (Centralized)

The oracle fee is deducted **immediately on every deposit** and accumulated in `accumulatedOracleFee`. This means all pool balances are always net of fees.

```
ANY deposit of 100 tokens:
├─ 1 token  → accumulatedOracleFee (1%)
└─ 99 tokens → distributed to appropriate pools
```

### Contestant Deposits

When a contestant joins, their deposit (minus oracle fee) goes entirely to the prize pool:

```
joinContest(100):
├─ 1 → accumulatedOracleFee
└─ 99 → contestPrizePool
```

### Spectator Deposits

When a spectator predicts, their deposit is split THREE ways (after oracle fee):

```
addPrediction(100):
├─ 1 → accumulatedOracleFee (oracle fee first)
└─ 99 → split three ways:
    ├─ 7.425 → contestPrizePoolSubsidy (7.5% of 99)
    ├─ 7.425 → contestantSubsidy[entryId] (7.5% of 99)
    └─ 84.15 → predictionPrizePool (85% of 99, backs ERC1155 tokens)
```

**All percentages are configurable per contest.**

## Token Flow

### Complete Flow Example (100 token deposit)

#### Contestant Flow

```
User deposits 100
  ↓
1% oracle fee deducted → accumulatedOracleFee
  ↓
99 → contestPrizePool
  ↓
Settlement calculates prize splits
  ↓
Winner claims via claimEntryPayout()
```

#### Spectator Flow

```
User deposits 100
  ↓
1% oracle fee deducted → accumulatedOracleFee
  ↓
99 split:
├─ 7.5% → contestPrizePoolSubsidy (augments contestant prizes)
├─ 7.5% → contestantSubsidy[entryId] (bonus to entry owner)
└─ 85% → predictionPrizePool (backs tokens)
  ↓
Mint ERC1155 tokens (amount based on LMSR price)
  ↓
Settlement determines winner
  ↓
If predicted winner: claim proportional share via claimPredictionPayout()
If predicted loser: tokens worthless
```

### Withdrawal Flows

#### Spectator Withdrawals (OPEN or CANCELLED)

Spectators can withdraw and get 100% refund:

- Oracle fee is reversed (deducted from accumulatedOracleFee)
- All three splits are reversed (prizeShare, userShare, collateral)
- User receives full deposit back

#### Contestant Withdrawals (OPEN or CANCELLED)

Contestants can withdraw and get 100% refund, BUT spectators who predicted on them DON'T get refunded - their funds are redistributed to other winners:

```
Entry A withdraws after spectators predicted 100 on Entry A:
├─ Contestant A → Gets full 100 deposit back
└─ Spectator funds (99 after oracle fee) redistributed:
    ├─ 7.425 → contestPrizePoolSubsidy ✅ Goes to ALL winners
    ├─ 7.425 → contestPrizePoolSubsidy ✅ Orphaned bonus moved to prize pool
    └─ 84.15 → predictionPrizePool ✅ Goes to spectators who predicted winner
```

**Key Point:** Spectators don't get refunded when their entry withdraws. Instead, their funds are redistributed to other winners. This incentivizes spectators to predict on committed entries.

## Accounting Model

### State Variables (Always Net of Oracle Fees)

```solidity
accumulatedOracleFee        // Oracle's accumulated fee, claimable
contestPrizePool            // Contestant deposits (net of fees)
contestPrizePoolSubsidy     // Spectator subsidy to prizes (net of fees)
contestantSubsidy[entryId]  // Spectator bonus per entry (net of fees)
predictionPrizePool         // Spectator collateral pool (net of fees)
```

### Invariant

At any point in time:

```
contract balance = accumulatedOracleFee
                 + contestPrizePool
                 + contestPrizePoolSubsidy
                 + Σ(contestantSubsidy)
                 + predictionPrizePool
```

**After all claims, contract balance = 0.** All funds are distributed - nothing is locked.

### Settlement (Pure Accounting)

Settlement does **NO transfers**, only calculations:

1. Calculate Layer 1 prize pool: `contestPrizePool + contestPrizePoolSubsidy`
2. Store prize payouts in `finalEntryPayouts[entryId]` based on `payoutBps`
3. Store bonus payouts in `contestantSubsidy[entryId]` (already net of fees)
4. Set `spectatorWinningEntry` to first entry in winningEntries array
5. If no supply on winning entry: redistribute prediction pool to winners

**That's it.** No transfers, no fee calculations. Everything is already net of fees.

### Fund Distribution Guarantee

**Every token deposited is distributed to someone:**

- **Contestant deposits** → Winning contestants (via `finalEntryPayouts`)
- **Spectator prize share** → Winning contestants (via `contestPrizePoolSubsidy`)
- **Spectator entry bonuses** → Entry owners (via `contestantSubsidy`) OR moved to prize pool if entry withdrew
- **Spectator collateral** → Winning spectators (via `predictionPrizePool`)
- **Oracle fees** → Oracle (via `accumulatedOracleFee`)

If users don't claim, oracle can use `sweepToTreasury()` after expiry to recover unclaimed funds.

### Claims (Pull-Based)

After settlement, users claim their payouts:

```solidity
// Contestants claim prize + bonus
claimEntryPayout(entryId)
  → pays finalEntryPayouts[entryId] + contestantSubsidy[entryId]

// Oracle claims accumulated fees
claimOracleFee()
  → pays accumulatedOracleFee

// Spectators claim winnings (winner-take-all)
claimPredictionPayout(entryId)
  → if entryId == spectatorWinningEntry:
      pays (userTokens / totalSupply) * predictionPrizePool
```

## API Reference

### Core Functions

#### For Contestants

```solidity
// Join contest (oracle fee deducted immediately)
function joinContest(uint256 entryId) external
// State: OPEN only
// Deducts 1% oracle fee, adds remainder to contestPrizePool

// Leave before activation (get full refund)
function leaveContest(uint256 entryId) external
// State: OPEN or CANCELLED
// Reverses oracle fee, spectator funds stay in pool (no auto-refund)

// Claim prize + bonus after settlement
function claimEntryPayout(uint256 entryId) external
// State: SETTLED
// Pays finalEntryPayouts[entryId] + contestantSubsidy[entryId]
```

#### For Spectators

```solidity
// Add prediction (oracle fee deducted immediately)
function addPrediction(uint256 entryId, uint256 amount) external
// State: OPEN or ACTIVE
// Deducts oracle fee, splits remainder, mints ERC1155 tokens

// Withdraw prediction (only before contest starts)
function withdrawPrediction(uint256 entryId, uint256 tokenAmount) external
// State: OPEN or CANCELLED only
// Reverses all accounting, returns 100% of deposit

// Check current LMSR price
function calculateEntryPrice(uint256 entryId) public view returns (uint256)

// Claim winnings (winner-take-all)
function claimPredictionPayout(uint256 entryId) external
// State: SETTLED
// Only pays if entryId == spectatorWinningEntry
```

#### For Oracle

```solidity
// Activate contest (locks entry registration)
function activateContest() external onlyOracle

// Close predictions (locks spectator deposits)
function closePredictions() external onlyOracle

// Settle contest (pure accounting, NO transfers)
function settleContest(
    uint256[] calldata winningEntries,
    uint256[] calldata payoutBps
) external onlyOracle
// Stores all payouts, first entry is spectator winner
// payoutBps must sum to 10000 (100%)

// Claim accumulated oracle fees
function claimOracleFee() external
// Callable by oracle, pays accumulatedOracleFee

// Cancel contest (enables full refunds)
function cancelContest() external onlyOracle
```

### Optional Push Functions (Convenience)

These are optional helpers for the oracle to push payouts instead of waiting for claims:

```solidity
// Push prizes + bonuses to specific entries
function pushContestantPayouts(uint256[] calldata entryIds) external onlyOracle

// Push winnings to specific spectators
function pushSpectatorPayouts(address[] calldata spectators, uint256 entryId) external onlyOracle

// Sweep all unclaimed funds after expiry
function sweepToTreasury() external onlyOracle
// Requirements: block.timestamp >= expiryTimestamp
```

## State Machine

```
┌─────────────────────────────────────────────────────────────┐
│ OPEN                                                        │
│  • Contestants: joinContest() / leaveContest()             │
│  • Spectators: addPrediction() / withdrawPrediction()      │
│  • Oracle: activateContest()                               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ ACTIVE                                                       │
│  • Spectators: addPrediction() only (no withdrawals)        │
│  • Oracle: closePredictions() [optional]                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ LOCKED [optional]                                           │
│  • No deposits or withdrawals                               │
│  • Oracle: settleContest()                                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ SETTLED                                                      │
│  • Contestants: claimEntryPayout()                          │
│  • Spectators: claimPredictionPayout()                      │
│  • Oracle: claimOracleFee()                                 │
│  • Oracle: pushContestantPayouts() / pushSpectatorPayouts() │
│  • Oracle: sweepToTreasury() [after expiry]                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ CLOSED                                                       │
│  • All funds distributed or swept                           │
└─────────────────────────────────────────────────────────────┘

CANCELLATION PATH (from OPEN or ACTIVE only):
┌─────────────────────────────────────────────────────────────┐
│ CANCELLED                                                    │
│  • Full refunds available via leaveContest() and            │
│    withdrawPrediction()                                      │
└─────────────────────────────────────────────────────────────┘
```

## Testing

### Run Tests

```bash
# All tests
forge test

# Accounting tests specifically
forge test --match-path "test/Contest_Accounting.t.sol" -vv

# With gas reports
forge test --gas-report
```

### Test Coverage

**Contest_Accounting.t.sol** - 11 comprehensive tests:

- ✅ S1: No spectators, verify oracle fee from contestants
- ✅ S2: Spectators on multiple entries, verify fee splits
- ✅ S3: Withdrawals during OPEN, verify accounting reversals
- ✅ S4: Lock predictions, verify no withdrawals in LOCKED
- ✅ E1: Entry withdrawn, spectators lose capital (no auto-refund)
- ✅ E2: Zero spectators, varied payout splits
- ✅ E3: All spectators on losing entry
- ✅ E4: No supply on winning entry, redistribute to contestants
- ✅ E5: High oracle fee (10%), verify rounding safety
- ✅ E6: Sweep unclaimed funds after expiry
- ✅ Invariant: Zero balance after all claims

**All tests passing ✅**

## Key Simplifications

Compared to traditional prediction market + contest systems:

1. **Immediate Fee Deduction:** Oracle fees deducted at deposit time, not settlement
2. **Pure Accounting Settlement:** `settleContest()` only stores payouts, no transfers
3. **Real-Time Accurate Balances:** All pool variables always reflect true claimable amounts
4. **No Complex Loops:** Removed auto-refund loops when contestants withdraw
5. **Centralized Fee Tracking:** Single `accumulatedOracleFee` variable
6. **Pull-Based Claims:** Users control gas costs by claiming when ready
7. **Optional Push:** Oracle can help users via optional push functions

## Formula Reference

### Oracle Fee (on any deposit)

```
oracleFee = amount * oracleFeeBps / 10000
netAmount = amount - oracleFee
```

### Spectator Split (on netAmount)

```
prizeShare = netAmount * prizeShareBps / 10000
userShare = netAmount * userShareBps / 10000
collateral = netAmount - prizeShare - userShare
```

### LMSR Token Minting

```
price = PRICE_PRECISION + (|netPosition[entryId]| * demandSensitivityBps / liquidityParameter)
tokensToMint = collateral * PRICE_PRECISION / price
```

### LMSR Pricing Mechanism

The `liquidityParameter` controls how steep the price curve is for spectator predictions. A lower value creates steeper prices (early bettors get much better prices), while a higher value creates flatter prices.

**Dynamic Calculation:**

The ContestFactory automatically calculates `liquidityParameter` based on contest size:

```
liquidityParameter = contestantDepositAmount × 100
```

**Why This Works:**

Higher entry fees typically attract more prediction volume, so the curve should be flatter to accommodate larger bets without extreme price impact. Lower entry fees have less volume, so a steeper curve creates stronger early incentives.

**Examples:**

| Entry Fee | liquidityParameter | Curve Steepness | Effect                                             |
| --------- | ------------------ | --------------- | -------------------------------------------------- |
| $10       | 1,000              | Very steep      | Strong early advantage, 20x+ premium at $5K volume |
| $100      | 10,000             | Steep           | Good early advantage, 3x premium at $5K volume     |
| $1,000    | 100,000            | Moderate        | Balanced, 1.5x premium at $50K volume              |
| $10,000   | 1,000,000          | Flatter         | Accommodates whales, 1.2x premium at $200K volume  |

**Gaming Protection:**

The steep curve (for typical contest sizes) provides:

- **Early incentive:** First bettors get best prices (up to 3-10x advantage over late bettors)
- **Whale protection:** Late large bets pay significant premiums (50-200%)
- **Anti-gaming:** Tiny early bets ($0.01) have negligible impact on pricing
- **Proportional rewards:** Your share of winnings is proportional to your investment

**Price Formula:**

```
demandPremium = (netPosition × demandSensitivityBps) / liquidityParameter
price = 1,000,000 + demandPremium

At $5,000 volume with liquidityParameter = 10,000:
- Early bettor: price ≈ 1.00 (base)
- Late bettor: price ≈ 3.10 (+210% premium)
```

### Settlement Payouts

```
layer1Pool = contestPrizePool + contestPrizePoolSubsidy
finalEntryPayouts[i] = layer1Pool * payoutBps[i] / 10000
```

### Spectator Claims

```
payout = userTokenBalance * predictionPrizePool / totalSupply
```

## Creating Contests

**Recommended:** Use `ContestFactory.createContest()` which automatically calculates optimal pricing parameters.

The ContestFactory creates contests with automatic `liquidityParameter` calculation based on entry fee, ensuring appropriate price curves for each contest size.

### Contest Constructor Parameters

```solidity
constructor(
    address _paymentToken,          // ERC20 token for deposits (e.g., USDC)
    address _oracle,                // Oracle address (settles contest)
    uint256 _contestantDepositAmount, // Fixed entry fee
    uint256 _oracleFeeBps,          // Oracle fee (e.g., 100 = 1%)
    uint256 _expiryTimestamp,       // When contest expires
    uint256 _liquidityParameter,    // LMSR liquidity (auto-calculated by factory)
    uint256 _demandSensitivityBps,  // LMSR sensitivity (e.g., 500 = 5%)
    uint256 _prizeShareBps,         // Spectator → prize pool (e.g., 750 = 7.5%)
    uint256 _userShareBps           // Spectator → entry bonus (e.g., 750 = 7.5%)
)
```

**Note:** The `_liquidityParameter` is typically calculated by ContestFactory as `contestantDepositAmount × 100`. This can be overridden if custom pricing curves are needed.

**Constraints:**

- `_oracleFeeBps <= 1000` (max 10%)
- `_prizeShareBps + _userShareBps <= 10000` (max 100%)
- `_expiryTimestamp > block.timestamp`

## License

MIT

---

**Smart Contract:** [`Contest.sol`](./src/Contest.sol)  
**Tests:** [`Contest_Accounting.t.sol`](./test/Contest_Accounting.t.sol)  
**Factory:** [`ContestFactory.sol`](./src/ContestFactory.sol)
