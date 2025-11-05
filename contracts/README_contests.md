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

The Contest contract combines three layers in a single contract:

**Layer 0 (Oracle):** Provides real-world event data and settles the contest.

**Layer 1 (Primary):** Primary participants deposit tokens to enter, oracle determines winners, winners claim prizes based on performance.

**Layer 2 (Secondary):** Secondary participants predict on primary positions, hold ERC1155 tokens representing their positions, and claim winnings if they predicted the winner.

**Dynamic Cross-Subsidy:** Deposits can redirect a capped portion of their net amount to the opposite layer to maintain a configurable primary-vs-secondary balance.

## Core Concepts

### Oracle Fee (Centralized)

The oracle fee is deducted **immediately on every deposit** and accumulated in `accumulatedOracleFee`. This means all pool balances are always net of fees.

```
ANY deposit of 100 tokens:
├─ 5 tokens → accumulatedOracleFee (5%)
└─ 95 tokens → distributed to appropriate pools
```

### Primary Participant Deposits

When a primary participant joins, their deposit (minus oracle fee) primarily funds the prize pool. If the primary side would exceed the configured target share, up to `maxCrossSubsidyBps` of the net deposit is redirected to the secondary collateral pool:

```
addPrimaryPosition(100):
├─ 5 → accumulatedOracleFee (5%)
└─ 95 (after fee) →
    ├─ ≤ 14.25 → secondaryPrizePool (cross-subsidy, max 15% if primary > target)
    └─ remainder → primaryPrizePool
```

### Secondary Participant Deposits

When a secondary participant adds a position, the oracle fee is deducted first. Then a position bonus is allocated directly to the entry owner. Finally, the remaining amount goes through cross-subsidy calculation, with the remainder backing the newly minted ERC1155 tokens:

```
addSecondaryPosition(entryId, 100):
├─ 5 → accumulatedOracleFee (oracle fee first, 5%)
└─ 95 (after fee) →
    ├─ 4.75 → primaryPositionSubsidy[entryId] (position bonus to entry owner, 5%)
    └─ 90.25 (remaining) →
        ├─ ≤ 13.54 → primaryPrizePoolSubsidy (cross-subsidy toward target, max 15%)
        └─ remainder → secondaryPrizePool (backs ERC1155 tokens)
```

**Position bonuses are claimable by entry owners after settlement, regardless of win/loss.**

**All percentages are configurable per contest.**

## Token Flow

### Complete Flow Example (100 token deposit)

#### Primary Participant Flow

```
User deposits 100
  ↓
5% oracle fee deducted → accumulatedOracleFee
  ↓
95 → primaryPrizePool (with ≤ 15% optionally redirected to secondaryPrizePool if above target)
  ↓
Settlement calculates prize splits
  ↓
Winner claims via claimPrimaryPayout()
```

#### Secondary Participant Flow

```
User deposits 100
  ↓
5% oracle fee deducted → accumulatedOracleFee
  ↓
95 (after fee) →
  ├─ 5% → primaryPositionSubsidy[entryId] (bonus to entry owner)
  └─ 90.25 (remaining) →
      ├─ ≤ 15% → primaryPrizePoolSubsidy (cross-subsidy to primary if below target)
      └─ remainder → secondaryPrizePool (backs tokens)
  ↓
Mint ERC1155 tokens (amount based on LMSR price)
  ↓
Settlement determines winner
  ↓
If predicted winner: claim proportional share via claimSecondaryPayout()
If predicted loser: tokens worthless
```

### Scenario: 30% Primary Target, 15% Cross-Subsidy Cap

- Parameters: oracle fee 5%, `positionBonusShareBps = 500` (5% position bonus), `targetPrimaryShareBps = 3000`, `maxCrossSubsidyBps = 1500`.
- Initial state: all pools are 0.

| Step | Action                | Primary Prize Pool | Position Bonus | Primary Subsidy | Secondary Pool | Primary Share |
| ---- | --------------------- | ------------------ | -------------- | --------------- | -------------- | ------------- |
| 1    | Primary deposit 100   | 80.75              | 0.00           | 0.00            | 14.25          | 85.0%         |
| 2    | Secondary deposit 200 | 80.75              | 9.50           | 23.75           | 161.50         | 41.0%         |
| 3    | Primary deposit 100   | 175.50             | 9.50           | 23.75           | 161.50         | 56.4%         |

**Step 1 – primary joins:** The net deposit is 95 (after 5% oracle fee). Because the primary side would sit at 100% of the balance, the contract shifts the maximum 15% (14.25) across to the secondary pool. Primary entrants still have most of their capital in the prize pool, but secondary liquidity is immediately bootstrapped.

**Step 2 – secondary joins:** The net deposit is 190 (after 5% oracle fee). First, 5% position bonus (9.5) goes to Entry 1's owner. From the remaining 180.5, the primary side is well below the 30% target, so 13.16% cross-subsidy (23.75) flows into `primaryPrizePoolSubsidy`. The remaining 156.75 backs the spectator's ERC1155 tokens.

**Step 3 – another primary joins:** The net 95 deposit (after oracle fee) pushes the ratio above the target. The contract redirects 14.25 (15% max) to the secondary pool. The remaining 80.75 goes to primaryPrizePool, bringing the primary share to ~56%.

### Incentive Observations

- **Primary entrants enable secondary markets when light:** Early primary deposits are required to seed secondary liquidity (step 1), enabling prediction markets to form - a necessary cost for the dual-market architecture.
- **Secondary entrants boost primary rewards when underweight:** In step 2, spectators contribute 5% as position bonuses (9.5) directly to the entry owner, plus cross-subsidy (23.75) to the prize pool when primary side is below the 30% target.
- **Entry owners rewarded for popularity:** Every entry owner receives 5% of all secondary deposits on their entry, regardless of whether they win or lose.
- **Caps prevent over-correction:** When the ratio is already near the 30% target (step 3), cross-subsidy adjusts dynamically. Larger imbalances would push up to the 15% cap per deposit, but never drain an entire contribution.
- **Dynamic optics:** As the cross-subsidy ebbs and flows, dashboards can surface `getPrimarySideShareBps()` so entrants see whether the next deposit is likely to receive extra support or subsidize the other side.

### Withdrawal Flows

#### Secondary Participant Withdrawals (OPEN or CANCELLED)

Secondary participants can withdraw and get 100% refund:

- Oracle fee is reversed (deducted from `accumulatedOracleFee`)
- Position bonus allocation is reversed (deducted from entry's `primaryPositionSubsidy`)
- Any cross-subsidy credited to the primary side is clawed back
- The remaining collateral is returned in full

#### Primary Participant Withdrawals (OPEN or CANCELLED)

Primary participants can withdraw and get 100% refund, BUT secondary participants who predicted on them DON'T get refunded — their collateral stays in the contract.

- Cross-subsidy booked for that entry is cleared, but the secondary pool remains untouched.
- Position bonuses accumulated on that entry are forfeited (added to primaryPrizePool for remaining contestants).
- On settlement, that collateral is distributed to whichever contestants and spectators ultimately win.

**Key Point:** Secondary participants don't get refunded when their entry withdraws. This incentivizes secondary participants to predict on committed entries.

## Accounting Model

### State Variables (Always Net of Oracle Fees)

```solidity
accumulatedOracleFee              // Oracle's accumulated fee (5% of all deposits), claimable
primaryPrizePool                  // Primary participant deposits (net of fees)
primaryPrizePoolSubsidy           // Cross-subsidy from secondary to primary prize pool
primaryPositionSubsidy[entryId]   // Position bonus per entry (5% of secondary deposits on that entry)
secondaryPrizePool                // Secondary collateral pool (net of fees, incl. primary cross-subsidy)
primaryToSecondarySubsidy[entry]  // Cross-subsidy tracked per primary entry (for withdrawal reversal)
secondaryToPrimarySubsidy[user][entry]
                                  // Cross-subsidy tracked per secondary participant (for withdrawal reversal)
totalPrimaryPositionSubsidies     // Sum of all outstanding primaryPositionSubsidy values
```

### Invariant

At any point in time:

```
contract balance = accumulatedOracleFee
                 + primaryPrizePool
                 + primaryPrizePoolSubsidy
                 + Σ(primaryPositionSubsidy)
                 + secondaryPrizePool
```

**After all claims, contract balance = 0.** All funds are distributed - nothing is locked.

### Settlement (Pure Accounting)

Settlement does **NO transfers**, only calculations:

1. Compute the Layer 1 prize pool: `primaryPrizePool + primaryPrizePoolSubsidy`.
2. Store prize payouts in `primaryPrizePoolPayouts[entryId]` based on `payoutBps` (winners only).
3. Position bonuses (`primaryPositionSubsidy[entryId]`) were already allocated per-deposit - no changes needed.
4. Set `secondaryWinningEntry` to the first entry in `winningEntries`.
5. If no ERC1155 supply exists on the winning entry, redistribute the secondary pool to Layer 1 winners proportionally.

**That's it.** No transfers, no fee calculations, no bonus splitting. Everything is already net of fees and bonuses are pre-allocated.

### Fund Distribution Guarantee

**Every token deposited is distributed to someone:**

- **Primary deposits** → Winning primary participants (via `primaryPrizePoolPayouts`)
- **Secondary position bonuses (5%)** → Entry owners (via `primaryPositionSubsidy[entryId]`, regardless of win/loss)
- **Secondary cross-subsidy** → Boosts primary prize pool when below target ratio
- **Secondary collateral** → Winning secondary participants (via `secondaryPrizePool`)
- **Oracle fees (5%)** → Oracle (via `accumulatedOracleFee`)
- **Cross-subsidy transfers** → Only rebalance between `primaryPrizePool`, `primaryPrizePoolSubsidy`, and `secondaryPrizePool`; no value is created or destroyed.

If users don't claim, oracle can use `closeContest()` after expiry to recover unclaimed funds.

### Claims (Pull-Based)

After settlement, users claim their payouts:

```solidity
// Primary participants claim prize + bonus
claimPrimaryPayout(entryId)
  → pays primaryPrizePoolPayouts[entryId] + primaryPositionSubsidy[entryId]

// Oracle claims accumulated fees
claimOracleFee()
  → pays accumulatedOracleFee

// Secondary participants claim winnings (winner-take-all)
claimSecondaryPayout(entryId)
  → if entryId == secondaryWinningEntry:
      pays (userTokens / totalSupply) * secondaryPrizePool
```

## API Reference

### Core Functions

#### For Primary Participants

```solidity
// Add primary position (oracle fee deducted immediately)
function addPrimaryPosition(uint256 entryId) external
// State: OPEN only
// Deducts 5% oracle fee, applies cross-subsidy, adds remainder to primaryPrizePool

// Remove before activation (get full refund)
function removePrimaryPosition(uint256 entryId) external
// State: OPEN or CANCELLED
// Reverses oracle fee & cross-subsidy, forfeits position bonuses, secondary funds stay in pool

// Claim prize + bonus after settlement
function claimPrimaryPayout(uint256 entryId) external
// State: SETTLED
// Pays primaryPrizePoolPayouts[entryId] + primaryPositionSubsidy[entryId]
```

#### For Secondary Participants

```solidity
// Add secondary position (oracle fee deducted immediately)
function addSecondaryPosition(uint256 entryId, uint256 amount) external
// State: OPEN or ACTIVE
// Deducts 5% oracle fee, allocates 5% position bonus, applies cross-subsidy, mints ERC1155 tokens

// Remove position (only before contest starts)
function removeSecondaryPosition(uint256 entryId, uint256 tokenAmount) external
// State: OPEN or CANCELLED only
// Reverses all accounting (oracle fee, bonus, cross-subsidy), returns 100% of deposit

// Check current LMSR price
function calculateSecondaryPrice(uint256 entryId) public view returns (uint256)

// Claim winnings (winner-take-all)
function claimSecondaryPayout(uint256 entryId) external
// State: SETTLED
// Only pays if entryId == secondaryWinningEntry
```

#### For Oracle

```solidity
// Activate contest (locks entry registration)
function activateContest() external onlyOracle

// Lock contest (closes secondary positions)
function lockContest() external onlyOracle

// Settle contest (pure accounting, NO transfers)
function settleContest(
    uint256[] calldata winningEntries,
    uint256[] calldata payoutBps
) external onlyOracle
// Stores all payouts, first entry is secondary winner
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
function pushPrimaryPayouts(uint256[] calldata entryIds) external onlyOracle

// Push winnings to specific secondary participants
function pushSecondaryPayouts(address[] calldata participants, uint256 entryId) external onlyOracle

// Close contest and sweep all unclaimed funds after expiry
function closeContest() external onlyOracle
// Requirements: block.timestamp >= expiryTimestamp
```

## State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│ OPEN                                                            │
│  • Primary: addPrimaryPosition() / removePrimaryPosition()     │
│  • Secondary: addSecondaryPosition() / removeSecondaryPosition()│
│  • Oracle: activateContest()                                    │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ ACTIVE                                                           │
│  • Secondary: addSecondaryPosition() only (no withdrawals)      │
│  • Oracle: lockContest() [optional]                             │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ LOCKED [optional]                                               │
│  • No deposits or withdrawals                                   │
│  • Oracle: settleContest()                                      │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ SETTLED                                                          │
│  • Primary: claimPrimaryPayout()                                │
│  • Secondary: claimSecondaryPayout()                            │
│  • Oracle: claimOracleFee()                                     │
│  • Oracle: pushPrimaryPayouts() / pushSecondaryPayouts()        │
│  • Oracle: closeContest() [after expiry]                        │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ CLOSED                                                           │
│  • All funds distributed or swept                               │
└─────────────────────────────────────────────────────────────────┘

CANCELLATION PATH (from OPEN or ACTIVE only):
┌─────────────────────────────────────────────────────────────────┐
│ CANCELLED                                                        │
│  • Full refunds available via removePrimaryPosition() and       │
│    removeSecondaryPosition()                                     │
└─────────────────────────────────────────────────────────────────┘
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

- ✅ S1: No secondary participants, verify oracle fee from primary participants
- ✅ S2: Secondary participants on multiple entries, verify fee splits
- ✅ S3: Withdrawals during OPEN, verify accounting reversals
- ✅ S4: Lock secondary positions, verify no withdrawals in LOCKED
- ✅ E1: Entry withdrawn, secondary participants lose capital (no auto-refund)
- ✅ E2: Zero secondary participants, varied payout splits
- ✅ E3: All secondary participants on losing entry
- ✅ E4: No supply on winning entry, redistribute to primary participants
- ✅ E5: High oracle fee (10%), verify rounding safety
- ✅ E6: Sweep unclaimed funds after expiry
- ✅ Invariant: Zero balance after all claims

**All tests passing ✅**

## Key Simplifications

Compared to traditional prediction market + contest systems:

1. **Immediate Fee Deduction:** Oracle fees deducted at deposit time, not settlement
2. **Pure Accounting Settlement:** `settleContest()` only stores payouts, no transfers
3. **Real-Time Accurate Balances:** All pool variables always reflect true claimable amounts
4. **No Complex Loops:** Removed auto-refund loops when primary participants withdraw
5. **Centralized Fee Tracking:** Single `accumulatedOracleFee` variable
6. **Pull-Based Claims:** Users control gas costs by claiming when ready
7. **Optional Push:** Oracle can help users via optional push functions

## Formula Reference

### Oracle Fee (on any deposit)

```
oracleFee = amount * oracleFeeBps / 10000
netAmount = amount - oracleFee
```

### Secondary Participant Split (on netAmount)

### Cross-Subsidy (Capped Per Deposit)

```
maxCross = netAmount * maxCrossSubsidyBps / 10000

// Primary deposit → secondary pool when above target
targetPrimary = (totalBalanceAfter * targetPrimaryShareBps) / 10000
desiredReduction = primaryAfterDeposit - targetPrimary
primaryCross = clamp(desiredReduction, 0, maxCross, netAmount)

// Secondary deposit → primary pool when below target
desiredIncrease = targetPrimary > primaryBefore ? targetPrimary - primaryBefore : 0
secondaryCross = clamp(desiredIncrease, 0, maxCross, netAmount)

// clamp(x, lower, cap1, cap2) = min(max(x, lower), cap1, cap2)
```

### LMSR Token Minting

```
price = PRICE_PRECISION + (|netPosition[entryId]| * demandSensitivityBps / liquidityParameter)
tokensToMint = collateral * PRICE_PRECISION / price
```

**Sequential Deposit Example:**

Let's walk through 10 people depositing $100 each on the same entry:

**Setup:**

- Entry fee: $100 (so liquidityParameter = $100 × 100 = 10,000)
- demandSensitivityBps: 500 (5%)
- Oracle fee: 5%
- Position bonus: 5%
- Cross-subsidy: 0 (for simplicity)

**Per Deposit Breakdown:**

```
Deposit: $100
├─ Oracle fee (5%): $5 → accumulatedOracleFee
└─ Net: $95
   ├─ Position bonus (5%): $4.75 → primaryPositionSubsidy[entryId]
   └─ Collateral: $90.25 → used to buy tokens at current LMSR price
```

**Sequential Pricing (PRICE_PRECISION = 1,000,000):**

| Deposit # | Net Position Before | Price     | Tokens Received | Net Position After | Cost per Token |
| --------- | ------------------- | --------- | --------------- | ------------------ | -------------- |
| 1         | 0                   | 1,000,000 | 90.25           | 90.25              | $1.00          |
| 2         | 90.25               | 1,004,513 | 89.85           | 180.10             | $1.00          |
| 3         | 180.10              | 1,009,005 | 89.45           | 269.55             | $1.01          |
| 4         | 269.55              | 1,013,478 | 89.05           | 358.60             | $1.01          |
| 5         | 358.60              | 1,017,930 | 88.66           | 447.26             | $1.02          |
| 6         | 447.26              | 1,022,363 | 88.27           | 535.53             | $1.02          |
| 7         | 535.53              | 1,026,777 | 87.89           | 623.42             | $1.03          |
| 8         | 623.42              | 1,031,171 | 87.51           | 710.93             | $1.03          |
| 9         | 710.93              | 1,035,547 | 87.13           | 798.06             | $1.04          |
| 10        | 798.06              | 1,039,903 | 86.76           | 884.82             | $1.04          |

**Key Observations:**

1. **Early Advantage:** First depositor pays $1.00 per token, 10th pays $1.04 per token (4% premium)
2. **Tokens Received Decrease:** Despite same collateral ($90.25), later depositors get fewer tokens
3. **Price Increases Linearly:** With 5% demand sensitivity, price goes up gradually
4. **Net Position Drives Price:** Each deposit increases netPosition, which increases price for next buyer

**Formula Breakdown for Deposit #5:**

```
Previous netPosition = 358.60
demandPremium = (358.60 × 500) / 10,000 = 17,930
price = 1,000,000 + 17,930 = 1,017,930
tokensToMint = (90.25 × 1,000,000) / 1,017,930 = 88.66
newNetPosition = 358.60 + 88.66 = 447.26
```

**Payout Scenario (Winner-Take-All):**

If this entry wins and total secondary collateral pool = $902.50:

- Deposit #1: (90.25 / 884.82) × $902.50 = $92.01 → **ROI: -8.0%**
- Deposit #5: (88.66 / 884.82) × $902.50 = $90.40 → **ROI: -9.6%**
- Deposit #10: (86.76 / 884.82) × $902.50 = $88.47 → **ROI: -11.5%**

**Why negative ROI?** The 5% oracle fee + 5% position bonus reduces the collateral pool by 10%. Winners need OTHER entries to also have secondary volume to profit, or they need to predict an underdog that wins.

### LMSR Pricing Mechanism

The `liquidityParameter` controls how steep the price curve is for secondary participant positions. A lower value creates steeper prices (early position holders get much better prices), while a higher value creates flatter prices.

**Dynamic Calculation:**

The ContestFactory automatically calculates `liquidityParameter` based on contest size:

```
liquidityParameter = primaryDepositAmount × 100
```

**Why This Works:**

Higher entry fees typically attract more prediction volume, so the curve should be flatter to accommodate larger positions without extreme price impact. Lower entry fees have less volume, so a steeper curve creates stronger early incentives.

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
// Position bonuses already allocated per-deposit during addSecondaryPosition()
// Settlement only calculates prize pool payouts

layer1Pool = primaryPrizePool + primaryPrizePoolSubsidy
primaryPrizePoolPayouts[i] = layer1Pool * payoutBps[i] / 10000

// Winners claim: primaryPrizePoolPayouts[i] + primaryPositionSubsidy[i]
// Losers claim: 0 + primaryPositionSubsidy[i] (if any bonuses accumulated)
```

### Secondary Participant Claims

```
payout = userTokenBalance * secondaryPrizePool / totalSupply
```

## Creating Contests

**Recommended:** Use `ContestFactory.createContest()` which automatically calculates optimal pricing parameters.

The ContestFactory creates contests with automatic `liquidityParameter` calculation based on entry fee, ensuring appropriate price curves for each contest size.

### Contest Constructor Parameters

```solidity
constructor(
    address _paymentToken,              // ERC20 token for deposits (e.g., USDC)
    address _oracle,                    // Oracle address (settles contest)
    uint256 _primaryDepositAmount,      // Fixed entry fee for primary participants
    uint256 _oracleFeeBps,              // Oracle fee (e.g., 500 = 5%)
    uint256 _expiryTimestamp,           // When contest expires
    uint256 _liquidityParameter,        // LMSR liquidity (auto-calculated by factory)
    uint256 _demandSensitivityBps,      // LMSR sensitivity (e.g., 500 = 5%)
    uint256 _positionBonusShareBps,     // Position bonus from secondary deposits (e.g., 500 = 5%)
    uint256 _targetPrimaryShareBps,     // Target share for primary side (e.g., 3000 = 30%)
    uint256 _maxCrossSubsidyBps         // Max cross-subsidy per deposit (e.g., 1500 = 15%)
)
```

**Note:** The `_liquidityParameter` is typically calculated by ContestFactory as `primaryDepositAmount × 100`. This can be overridden if custom pricing curves are needed.

**Constraints:**

- `_oracleFeeBps <= 1000` (max 10%, recommended 5%)
- `_positionBonusShareBps <= 10000` (recommended 500 = 5% per secondary deposit)
- `_targetPrimaryShareBps <= 10000` (recommended 3000 = 30%)
- `_maxCrossSubsidyBps <= 10000` (recommended 1500 = 15%)
- `_expiryTimestamp > block.timestamp`

## License

MIT

---

**Smart Contract:** [`Contest.sol`](./src/Contest.sol)  
**Tests:** [`Contest_Accounting.t.sol`](./test/Contest_Accounting.t.sol)  
**Factory:** [`ContestFactory.sol`](./src/ContestFactory.sol)
