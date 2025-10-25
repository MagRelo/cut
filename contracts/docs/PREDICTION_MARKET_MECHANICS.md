# Prediction Market Mechanics: Conditional Tokens + LMSR

This document explains how the PredictionMarket contract enables spectators to bet on fantasy contest participants using conditional token mechanics.

## Table of Contents

- [Overview](#overview)
- [Use Case](#use-case)
- [Architecture](#architecture)
- [Core Mechanics](#core-mechanics)
- [LMSR Pricing](#lmsr-pricing)
- [Example Flows](#example-flows)
- [Tradeoffs](#tradeoffs)

## Overview

The PredictionMarket contract implements a **Layer 2 betting market** on top of an existing **Layer 1 contest escrow**. It uses:

- **Conditional Tokens (ERC-1155)** - Tradeable outcome tokens
- **Complete Set Minting** - Conservation of value principle
- **LMSR Pricing** - Dynamic swap costs without external liquidity
- **Collateral-Bounded** - No unbounded loss risk

## Use Case

**Problem:** User A doesn't want to compete in a fantasy golf contest but wants to bet on User B (a skilled player) doing well.

**Solution:**

1. User B competes in Layer 1 contest (existing Escrow contract)
2. Spectator A deposits collateral in Layer 2 PredictionMarket
3. Spectator A receives tokens for ALL contestants (complete set)
4. Spectator A swaps tokens to concentrate on User B
5. Oracle resolves contest → Layer 2 inherits results
6. Spectator A redeems winning tokens for profit

**Optional:** User B could receive revenue share from betting volume on them.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Layer 1: Contest Escrow                   │
│  (Existing Escrow.sol - Users compete in fantasy golf)       │
│                                                               │
│  • User A deposits 100 USDC                                  │
│  • User B deposits 100 USDC                                  │
│  • User C deposits 100 USDC                                  │
│  • Oracle resolves: B=1st(60%), A=2nd(30%), C=3rd(10%)      │
│  • distribute() stores finalPayouts mapping                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ References via constructor
                        │ Reads results via getFinalPayouts()
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Layer 2: Prediction Market                       │
│  (New PredictionMarket.sol - Spectators bet on users)        │
│                                                               │
│  • Spectator X deposits 50 USDC                              │
│    → Receives complete set: 50 of each (A, B, C)            │
│  • Spectator X swaps A→B and C→B (LMSR priced)              │
│    → Now holds ~140 "User B wins" tokens                     │
│  • resolveFromEscrow() reads Layer 1 results                 │
│  • Spectator X redeems: 140 × 60% = 84 USDC (profit!)       │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

**Layer 1 (Contest):**

- `Escrow.sol` (existing, minimally modified)
- Users compete directly
- `finalPayouts` mapping stores results
- `getFinalPayouts()` exposes results to Layer 2

**Layer 2 (Prediction Market):**

- `PredictionMarket.sol` (new)
- Spectators bet on Layer 1 users
- ERC-1155 tokens are tradeable
- LMSR prices swaps dynamically
- Inherits resolution from Layer 1

## Core Mechanics

### 1. Complete Set Minting

When a spectator deposits collateral, they receive tokens for **all possible outcomes**:

```solidity
// Example: 3 contestants (User A, B, C)
function deposit(100 USDC) {
    // Mint complete set:
    _mint(spectator, outcomeId=0, 100); // 100 "User A" tokens
    _mint(spectator, outcomeId=1, 100); // 100 "User B" tokens
    _mint(spectator, outcomeId=2, 100); // 100 "User C" tokens
}
```

**Why complete sets?**

- Ensures conservation of value
- Sum of all outcome tokens = collateral deposited
- Enables "merging" back to collateral (exit mechanism)

**Key Properties:**

- No matter which user wins, the total redeemable value equals total collateral
- If User B wins 60%, each "User B" token redeems for 0.6 USDC
- Spectator holding 100 of each gets: (100×0.6) + (100×0.3) + (100×0.1) = 100 USDC back

### 2. Outcome Token Swaps

Spectators trade between outcome tokens to concentrate their position:

```solidity
swapOutcomes(fromId, toId, amount)
    ↓
1. Burns 'amount' of fromId tokens
2. Calculates swap cost via LMSR
3. Mints (amount - cost) of toId tokens
4. Cost stays as collateral (market maker fee)
```

**Example:**

```
Spectator holds 100 of each outcome
Wants pure bet on User B (outcome 1)

Swap 1: swapOutcomes(0, 1, 100)  // A → B
  • Burns 100 "User A" tokens
  • Cost = 0 (no demand yet)
  • Mints 100 "User B" tokens
  • Now holds: 0 A, 200 B, 100 C

Swap 2: swapOutcomes(2, 1, 100)  // C → B
  • Burns 100 "User C" tokens
  • Cost = 9.09 (LMSR calculates based on demand)
  • Mints 90.91 "User B" tokens
  • Now holds: 0 A, 290.91 B, 0 C
```

### 3. Merging Positions (Exit Mechanism)

If spectator holds a complete set, they can burn it to recover collateral:

```solidity
// Spectator holds 50 of EACH outcome
mergePositions(50)
    ↓
1. Verify complete set (50 of A, B, and C)
2. Burns 50 of each
3. Refunds 50 USDC

// Allows exiting before resolution
```

### 4. Oracle Resolution

After Layer 1 contest resolves:

```solidity
// Oracle resolves Layer 1
escrow.distribute([userB, userA, userC], [6000, 3000, 1000])
    ↓ stores in finalPayouts mapping

// Layer 2 reads results
market.resolveFromEscrow()
    ↓
1. Reads getFinalPayouts([userA, userB, userC])
2. Normalizes to basis points
3. Sets payoutNumerators = [3000, 6000, 1000]
   (User A=30%, User B=60%, User C=10%)
```

### 5. Redemption

Spectators burn their tokens to claim winnings:

```solidity
// Spectator holds 290.91 "User B" tokens
// User B payout = 6000 basis points (60%)

redeemPosition(outcomeId=1)
    ↓
payout = 290.91 × 6000 / 10000 = 174.55 USDC

// Started with 100 USDC → profit of 74.55 USDC!
```

## LMSR Pricing

### What is LMSR?

**Logarithmic Market Scoring Rule** - An automated market maker that prices outcome tokens based on demand without requiring external liquidity.

### Our Implementation

We use a simplified LMSR formula:

```solidity
cost = (amount × |netPosition[to]|) / (liquidityParameter + |netPosition[to]|)
```

**Variables:**

- `amount` - Number of tokens being swapped
- `netPosition[to]` - Current net demand for target outcome
- `liquidityParameter` - Controls curve steepness (higher = flatter = more liquid)

**Key Properties:**

1. **Starts at zero:** First swap has zero cost
2. **Increases with demand:** More people buying outcome X → higher cost to buy more X
3. **Bounded:** Cost always < amount (can't lose more than you put in)
4. **No external liquidity needed:** Math provides liquidity

### Example Pricing Curve

Assume `liquidityParameter = 1000 USDC`:

```
netPosition[B] = 0     → cost for 100 swap = 0 USDC      (0%)
netPosition[B] = 100   → cost for 100 swap = 9.09 USDC   (9%)
netPosition[B] = 500   → cost for 100 swap = 33.33 USDC  (33%)
netPosition[B] = 1000  → cost for 100 swap = 50 USDC     (50%)
netPosition[B] = 5000  → cost for 100 swap = 83.33 USDC  (83%)
```

As demand grows, cost approaches (but never reaches) 100%.

### Why This Works

**Collateral-Bounded:**

- Tokens only come from deposited collateral (complete sets)
- LMSR only prices swaps, doesn't mint new tokens
- Total tokens in circulation ≤ numOutcomes × totalCollateral
- Platform always solvent

**Parimutuel Compatible:**

- All deposits pooled
- No timing advantage (everyone gets same tokens per USDC)
- Final payout ratios from oracle, not swap activity
- Swap costs act as implicit "vig" staying in pool

## Example Flows

### Flow 1: Simple Bet

```
Setup:
  • Contest: User A, B, C compete
  • Market opens for betting

Phase 1 - Spectator Entry:
  Spectator X:
    ├─ deposit(100 USDC)
    └─ Receives: 100 A, 100 B, 100 C tokens

Phase 2 - Position Concentration:
  Spectator X bets on User B:
    ├─ swapOutcomes(A→B, 100) → cost=0, receive 100 B
    ├─ swapOutcomes(C→B, 100) → cost=9, receive 91 B
    └─ Final: 291 B tokens

Phase 3 - Resolution:
  Layer 1: User B wins (60%)
  Layer 2: resolveFromEscrow() → payoutNumerators[1] = 6000

Phase 4 - Redemption:
  Spectator X:
    ├─ redeemPosition(outcomeId=1)
    ├─ Payout = 291 × 0.6 = 174.6 USDC
    └─ Profit = 74.6 USDC (74.6% return!)
```

### Flow 2: Competing Spectators

```
Setup: Same contest (A, B, C)

Spectator X (bullish on B):
  ├─ deposit(100) → 100 of each
  ├─ swapOutcomes(A→B, 100) → cost=0, get 100 B
  ├─ swapOutcomes(C→B, 100) → cost=9, get 91 B
  └─ Holds: 291 B

Spectator Y (bullish on B too, but later):
  ├─ deposit(100) → 100 of each
  ├─ swapOutcomes(A→B, 100) → cost=13 (higher due to X's demand!)
  ├─ swapOutcomes(C→B, 100) → cost=20
  └─ Holds: 267 B

Resolution: User B wins (60%)
  • X redeems: 291 × 0.6 = 174.6 USDC (74.6% profit)
  • Y redeems: 267 × 0.6 = 160.2 USDC (60.2% profit)

Early mover advantage captured by LMSR pricing!
```

### Flow 3: Diversified Strategy

```
Spectator Z (risk-averse):
  ├─ deposit(100) → 100 of each
  └─ Keeps complete set (no swaps)

Resolution: User B wins (60%)
  • Redeem 100 A tokens: 100 × 0.3 = 30 USDC
  • Redeem 100 B tokens: 100 × 0.6 = 60 USDC
  • Redeem 100 C tokens: 100 × 0.1 = 10 USDC
  • Total: 100 USDC (break even)

Complete set always returns original deposit!
```

## Tradeoffs

### vs Original Escrow

| Feature                    | Original Escrow            | PredictionMarket                       |
| -------------------------- | -------------------------- | -------------------------------------- |
| **Participants**           | Compete directly           | Spectators bet on competitors          |
| **Token Type**             | Internal accounting        | Tradeable ERC-1155                     |
| **Entry Mechanism**        | Fixed deposit amount       | Complete set minting                   |
| **Pricing**                | Fixed entry fee            | Dynamic LMSR swaps                     |
| **Liquidity**              | N/A                        | Collateral-backed, always available    |
| **Oracle Role**            | Distributes funds directly | Reports payout vector only             |
| **Exit Before Resolution** | withdraw() refunds         | mergePositions() refunds complete sets |
| **Benefiting Contestants** | Win prize                  | Could receive % of betting volume      |

### vs External DEX

| Feature               | PredictionMarket (LMSR)            | Uniswap-style DEX        |
| --------------------- | ---------------------------------- | ------------------------ |
| **Liquidity Source**  | Deposited collateral + math        | External LPs required    |
| **Initial Liquidity** | None needed                        | Must be seeded           |
| **Pricing**           | LMSR curve                         | Constant product (x×y=k) |
| **Slippage**          | Predictable via formula            | Depends on pool depth    |
| **LP Risk**           | None (platform bears bounded risk) | Impermanent loss risk    |
| **Complexity**        | More complex                       | Standard AMM             |

### Benefits

✅ **No External Liquidity Needed** - Math provides liquidity
✅ **Bounded Risk** - Platform can't lose more than deposited
✅ **Transparent** - On-chain proof of positions
✅ **Composable** - Tokens are standard ERC-1155
✅ **Fair** - Complete sets ensure conservation of value
✅ **Parimutuel Compatible** - No timing advantage for deposits

### Limitations

❌ **Gas Intensive** - Multiple token mints/burns per action
❌ **LMSR Complexity** - Harder to understand than fixed odds
❌ **Early Mover Advantage** - First swappers get best prices
❌ **Cancellation Difficult** - Once tokens traded, hard to refund all
❌ **Oracle Dependency** - Requires trusted Layer 1 resolution

## Integration with Existing System

### Minimal Changes to Escrow

Only two additions to `Escrow.sol`:

```solidity
// 1. Add state variable
mapping(address => uint256) public finalPayouts;

// 2. Store payouts in distribute()
for (uint256 i = 0; i < _addresses.length; i++) {
    finalPayouts[_addresses[i]] = calculatedPayouts[i];
}

// 3. Add view function
function getFinalPayouts(address[] calldata _addresses)
    external view returns (uint256[] memory)
{
    uint256[] memory payouts = new uint256[](_addresses.length);
    for (uint256 i = 0; i < _addresses.length; i++) {
        payouts[i] = finalPayouts[_addresses[i]];
    }
    return payouts;
}
```

### Deployment Flow

```
1. Deploy Escrow (Layer 1)
2. Users enter contest via Escrow.deposit()
3. Oracle calls Escrow.closeDeposits()
4. Deploy PredictionMarket(escrowAddress) (Layer 2)
5. Spectators bet via PredictionMarket.deposit() + swapOutcomes()
6. Oracle closes PredictionMarket.closeMarket()
7. Oracle resolves Escrow.distribute()
8. Anyone calls PredictionMarket.resolveFromEscrow()
9. Spectators redeem via PredictionMarket.redeemPosition()
```

## Future Extensions

### 1. Revenue Sharing with Contestants

```solidity
// When spectators swap to bet on User B
// X% of swap cost → User B's bonus pool
function swapOutcomes(...) {
    uint256 swapCost = calculateLMSRCost(...);
    uint256 bonusShare = swapCost * BONUS_PERCENTAGE / 10000;
    contestantBonuses[toOutcomeParticipant] += bonusShare;
}
```

### 2. Dynamic Liquidity Parameter

```solidity
// Adjust liquidity based on total betting volume
liquidityParameter = BASE_LIQUIDITY + (totalCollateral / 10);
// More betting → more liquidity → flatter curve
```

### 3. Partial Redemptions

```solidity
// Redeem only some tokens (currently redeems all)
function redeemPosition(uint256 outcomeId, uint256 amount) {
    // Burn specific amount, not entire balance
}
```

### 4. Nested Conditions

```solidity
// Bet on "User B wins AND scores > 850 points"
// Requires combining multiple Layer 1 conditions
```

## Testing

Run the test suite:

```bash
cd contracts

# Basic functionality
forge test --match-contract PredictionMarketTest -vv

# LMSR pricing mechanics
forge test --match-contract PredictionMarketLMSRTest -vv

# Layer 1 → Layer 2 integration
forge test --match-contract LayeredIntegrationTest -vv

# All tests with gas reporting
forge test --gas-report
```

## Conclusion

The PredictionMarket contract demonstrates how **conditional tokens + LMSR pricing** enable a self-contained betting market on top of existing contest infrastructure. Key innovations:

1. **Complete sets** preserve value conservation
2. **LMSR** provides liquidity without external LPs
3. **Collateral-bounded** design eliminates unbounded loss
4. **Layer 2 pattern** separates competition from speculation
5. **Minimal changes** to existing Escrow contract

This architecture could extend to:

- Betting on tournament brackets
- Predicting season-long performance
- Meta-contests (betting on who bets on whom)
- Cross-chain prediction markets via bridge

The key insight: **contests are events that can themselves be bet on**, creating recursive layers of competition and prediction markets.
