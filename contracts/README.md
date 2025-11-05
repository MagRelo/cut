# Competition + Prediction Market Infrastructure

Universal smart contract system for **skill-based competitions with integrated prediction markets.**

Create a contest on top of any stream of events where:

- **An Oracle** provides real-world event data
- **Primary Participants** predict real-world events in a tournament format
- **Secondary Participants** predict the outcome of the primary tournament

**Use Cases:** Fantasy sports • Gaming tournaments • Trading competitions • Content creator battles • Skill-based challenges • Any measurable competition

## 📚 Table of Contents

- [Contest Lifecycle](#-contest-lifecycle)
- [State Transition Diagram](#-state-transition-diagram)
- [Economic Model](#-economic-model)
- [Incentive Mechanisms](#-incentive-mechanisms)
- [What This Infrastructure Enables](#-what-this-infrastructure-enables)
- [Competition Examples](#-competition-examples)
- [Security Features](#-security-features)
- [Economics](#-economics)

**📖 [Contest Technical Reference](./README_contests.md)** - Contracts, API, Deployment, Testing, State Machine, Quick Reference

## 📅 Contest Lifecycle

### Phase 1: OPEN - Registration & Early Positions

**State:** `ContestState.OPEN`  
**Secondary Positions:** ✅ Available (early positions enabled)

| Actor                      | Can Do                              | Function                                   |
| -------------------------- | ----------------------------------- | ------------------------------------------ |
| **Primary Participants**   | Join contest with entry ID          | `addPrimaryPosition(entryId)`              |
| **Primary Participants**   | Leave contest (funds redistributed) | `removePrimaryPosition(entryId)`           |
| **Secondary Participants** | Check prices                        | `calculateSecondaryPrice(entryId)`         |
| **Secondary Participants** | Add position                        | `addSecondaryPosition(entryId, amount)`    |
| **Secondary Participants** | Withdraw (100% refund)              | `removeSecondaryPosition(entryId, tokens)` |
| **Oracle/Admin**           | Activate contest                    | `activateContest()`                        |

**State transition:** Oracle calls `activateContest()` → `ACTIVE`

---

### Phase 2: ACTIVE - Competition Running, Secondary Positions Open

**State:** `ContestState.ACTIVE`  
**Secondary Positions:** ✅ Available  
**Withdrawals:** ❌ NOT allowed (positions locked in once competition starts)

| Actor                      | Can Do                 | Function                                 |
| -------------------------- | ---------------------- | ---------------------------------------- |
| **Primary Participants**   | ❌ Cannot join/leave   | -                                        |
| **Secondary Participants** | Add positions (LMSR)   | `addSecondaryPosition(entryId, amount)`  |
| **Secondary Participants** | ❌ Cannot withdraw     | -                                        |
| **Secondary Participants** | Check prices           | `calculateSecondaryPrice(entryId)`       |
| **Oracle/Admin**           | Lock contest           | `lockContest()`                          |
| **Oracle/Admin**           | Cancel contest         | `cancelContest()`                        |
| **Oracle/Admin**           | Settle (if not locked) | `settleContest(winningEntries, payouts)` |

**State transition:** Oracle calls `lockContest()` → `LOCKED`

**Note:** Once the contest is activated, secondary participants can still add new positions but CANNOT withdraw existing positions. This prevents unfair behavior as the competition progresses and outcomes become clearer.

---

### Phase 3: LOCKED - Competition Finishing, Secondary Positions Closed

**State:** `ContestState.LOCKED`  
**Secondary Positions:** ❌ Closed

| Actor                      | Can Do                 | Function                                     |
| -------------------------- | ---------------------- | -------------------------------------------- |
| **Primary Participants**   | ❌ Waiting for results | -                                            |
| **Secondary Participants** | Check prices (locked)  | `calculateSecondaryPrice(entryId)`           |
| **Secondary Participants** | ❌ Cannot add position | -                                            |
| **Secondary Participants** | ❌ Cannot withdraw     | -                                            |
| **Oracle/Admin**           | Settle contest         | `settleContest(winningEntries[], payouts[])` |

**Purpose:** Competition is finishing, outcome not yet certain, but secondary positions locked to prevent last-second unfair positions.

**Note:** This phase is optional - oracle can call `settleContest()` directly from ACTIVE state.

**State transition:** Oracle calls `settleContest()` → `SETTLED`

---

### Phase 4: SETTLED - Claiming

**State:** `ContestState.SETTLED`  
**Secondary Positions:** Closed

| Actor                      | Can Do                                          | Function                           |
| -------------------------- | ----------------------------------------------- | ---------------------------------- |
| **Primary Participants**   | Claim prize + position bonus (winners + losers) | `claimPrimaryPayout(entryId)`      |
| **Primary Participants**   | Winners get prize + bonus, losers get 0 + bonus | Same function                      |
| **Secondary Participants** | Check final prices                              | `calculateSecondaryPrice(entryId)` |
| **Secondary Participants** | Claim secondary payout                          | `claimSecondaryPayout(entryId)`    |
| **Secondary Participants** | Winners get payout, losers get 0                | Same function                      |
| **Oracle/Admin**           | Distribute after expiry (see Phase 5)           | `closeContest()`                   |

**State transition:** Oracle calls `closeContest()` (after expiry) → `CLOSED`

---

### Phase 5: CLOSED - Force Distribution (After Expiry)

**State:** `ContestState.CLOSED`  
**Trigger:** Oracle calls `closeContest()` after contest expiry

| Actor            | Can Do                          | Function |
| ---------------- | ------------------------------- | -------- |
| **All Users**    | Already received forced payouts | -        |
| **Oracle/Admin** | ❌ No more actions              | -        |

**Purpose:** Prevent funds from being locked forever if users forget to claim.

**How it works:**

- After expiry timestamp, oracle can call `closeContest()`
- Sweeps all unclaimed funds to treasury (oracle address)
- Primary participants who didn't claim lose their prizes
- Winning secondary participants who didn't claim lose their winnings
- Losing secondary participants already got nothing (winner-take-all)

**Terminal state:** Contest fully closed, all funds distributed or swept.

---

### (Alternative) CANCELLED - Refunds

**State:** `ContestState.CANCELLED`

| Actor                      | Can Do                                 | Function                                   |
| -------------------------- | -------------------------------------- | ------------------------------------------ |
| **Primary Participants**   | Get full refund (100% of deposit)      | `removePrimaryPosition(entryId)`           |
| **Secondary Participants** | Check prices (locked)                  | `calculateSecondaryPrice(entryId)`         |
| **Secondary Participants** | Get full refund (100% including fees!) | `removeSecondaryPosition(entryId, tokens)` |
| **Oracle/Admin**           | ❌ No more actions                     | -                                          |

**Terminal state:** Contest cancelled, all deposits refunded.

**How to get to CANCELLED:**

- Oracle calls `cancelContest()` (anytime before SETTLED - settlement is final!)
- Anyone calls `cancelExpired()` (after expiry timestamp, if not settled)

**Refund guarantee:**

```
Primary Participants: Get back full deposit amount (oracle fee, cross-subsidy, and position bonuses reversed)
Secondary Participants: Get back 100% of what they deposited (all fees and bonuses reversed!)

Example:
- Secondary participant deposited 100 tokens
- Oracle fee was 5, position bonus was 4.75, cross-subsidy was 13.54
- If cancelled: Get back full 100 tokens ✅ (all accounting reversed)
```

---

## 🔄 State Transition Diagram

```
                    OPEN
                     │
                     │ Primary participants join
                     │ Secondary participants add positions (early positions!)
                     │ Secondary participants can withdraw (free exit)
                     │
                     │ Oracle: activateContest()
                     ▼
                  ACTIVE
                     │
                     │ Competition in progress
                     │ Secondary participants continue adding positions
                     │ NO withdrawals (positions locked in)
                     │
                     │ Oracle: lockContest() [OPTIONAL]
                     ▼
                  LOCKED
                     │
                     │ Competition finishing
                     │ No more positions/withdrawals
                     │
                     │ Oracle: settleContest(...)
                     │ (Can also call from ACTIVE)
                     │ Calculates Layer 1 (Primary) prize payouts
                     │ Sets Layer 2 (Secondary) winner
                     ▼
                  SETTLED
                     │
                     │ Users claim payouts
                     │ whenever ready
                     │
                     │ (After expiry)
                     │ Oracle: closeContest()
                     │ Sweeps unclaimed funds
                     ▼
                  CLOSED
                     │
                     │ All funds distributed
                     ▼
                  (done)

        (Alternative path from OPEN/ACTIVE only)
                     │
                     │ Oracle: cancelContest()
                     │ OR
                     │ Anyone: cancelExpired()
                     │ (Cannot cancel after LOCKED/SETTLED)
                     ▼
                 CANCELLED
                     │
                     │ All refunds
                     ▼
                  (done)
```

## 💰 Economic Model

### Key Processes

**Oracle Fee Deduction**: 5% deducted immediately from ALL deposits (primary and secondary) and accumulated for platform/oracle.

**Position Bonus Allocation**: 5% of each secondary deposit goes directly to that entry's owner (allocated per-deposit, claimable after settlement).

**Dynamic Cross-Subsidy**: After position bonus, remaining funds automatically redirect between primary/secondary pools to maintain 30% primary target (up to 15% max per deposit). This prevents one side from dominating and ensures both markets remain viable.

**Settlement**: Calculates prize payouts for winners from combined primary pools. Position bonuses already accumulated per-deposit - no redistribution needed.

### Example: 3 primary participants, 10 secondary participants

**Phase 1: Primary Participants Enter**

```
Entry A deposits: 100 tokens → 5% oracle fee = 5 tokens, remaining may cross-subsidize to secondary if above 30% target
Entry B deposits: 100 tokens → 5% oracle fee = 5 tokens, same cross-subsidy logic
Entry C deposits: 100 tokens → 5% oracle fee = 5 tokens, same cross-subsidy logic
─────────────────────────────────────────────────────────
Oracle fees accumulated: 15 tokens
Primary prize pool: ~285 tokens (after any cross-subsidy balancing)
```

**Phase 2: Secondary Participants Add Positions**

```
5 people add 100 tokens on Entry B = 500 tokens (50% prediction volume)
3 people add 100 tokens on Entry A = 300 tokens (30% prediction volume)
2 people add 100 tokens on Entry C = 200 tokens (20% prediction volume)
─────────────────────────────────────────
Total secondary deposits: 1,000 tokens

Oracle fee deducted at deposit (5%): 50 tokens → accumulatedOracleFee
Remaining: 950 tokens allocated as follows:
- Position bonuses (5%): 47.5 tokens → primaryPositionSubsidy[entryId] per entry
- Remaining: 902.5 tokens
  - Cross-subsidy (up to 15%): redirects to primary if below 30% target ratio
  - Collateral: remainder → secondaryPrizePool (backs ERC1155 prediction tokens)
```

**Phase 3: ONE Oracle Call Settles**

```solidity
contest.settleContest(
    [entryB, entryA, entryC],  // Winning entry IDs (only non-zero payouts)
    [6000, 3000, 1000]          // 60%, 30%, 10%
)
// Note: Only pass entries that receive payouts - no zeros needed!
```

**What happens at settlement:**

**Note:** Oracle fees (5%) were already deducted at deposit time, so all pools are already net of fees.

1. **Prize pool calculation**: Combine base primary deposits + cross-subsidy from secondary

   - `layer1Pool = primaryPrizePool + primaryPrizePoolSubsidy`

2. **Winner payouts**: Distribute layer1Pool to winners based on payoutBps

   - `primaryPrizePoolPayouts[entryId] = layer1Pool × payoutBps[i] / 10000`

3. **Position bonuses**: Already allocated per-deposit during addSecondaryPosition() - no changes needed

   - Winners and losers both have bonuses waiting in `primaryPositionSubsidy[entryId]`

4. **Set prediction winner**: First entry in winners array becomes the secondary market winner
   - Secondary winners claim proportional share of `secondaryPrizePool`

**Key Insight:** Layer 1 prizes are based on PERFORMANCE (oracle-determined), while position bonuses are based on POPULARITY (secondary deposit volume on each entry). Winners get both; losers get only bonuses!

**Phase 4: Users Claim**

Primary participants claim their performance-based prizes plus any popularity bonuses. Secondary participants who predicted the winner split all collateral (winner-take-all).

## 🎯 Incentive Mechanisms

### For Primary Participants

- **Performance Prizes**: Based on actual competition results (oracle-determined)
- **Position Bonuses**: 5% of all secondary deposits on their entry (regardless of win/loss)
- **Bigger Prize Pools**: Augmented by cross-subsidy from secondary when primary < 30% target
- **Early Entry Costs**: May seed secondary liquidity (up to 15% cross-subsidy when primary > 30%)

### For Secondary Participants

- **Winner-Take-All**: All collateral goes to those who predicted correctly
- **Early Pricing Advantage**: Better odds when joining early (LMSR curve)
- **Support Your Entry**: 5% of your deposit directly rewards the entry owner
- **Cross-Subsidy Boost**: When primary < 30%, your deposits boost primary prizes (up to 15%)
- **Safe Withdrawals**: 100% refunds during OPEN phase (change your mind!)

### System-Wide Incentives

- **Balanced Markets**: Cross-subsidy targets 30% primary / 70% secondary ratio (up to 15% per deposit)
- **Market Discovery**: Prediction odds reveal true entry rankings
- **Entry Owner Rewards**: Popular entries earn bonuses even if they lose the competition
- **Engaged Communities**: Dual-market structure increases participation
- **Configurable Economics**: All parameters tunable per contest

## ⚡ What This Infrastructure Enables

### 🎯 Engage Secondary Participants Financially

Transform passive viewers into active participants with skin in the game:

- **Prediction Markets:** Secondary participants predict on primary positions using dynamic LMSR pricing
- **Real Stakes:** Put money behind predictions - winners take all collateral
- **Price Discovery:** Market-driven odds reveal true position rankings
- **Early Advantage:** First predictors get better prices (incentivizes early engagement)
- **Safe Withdrawals:** 100% refunds during OPEN phase (change your mind before competition starts)

### 💰 Aligned Incentives

Smart fee structure benefits all participants:

- **Entry Popularity Bonuses:** 5% of secondary deposits go directly to entry owners (regardless of win/loss)
- **Cross-Subsidy Balancing:** Deposits dynamically redirect between pools to maintain 30% primary target
- **Oracle Fee:** Platform takes 5% for providing infrastructure, deducted at deposit time
- **No Hidden Costs:** All fees transparent and enforced by smart contract
- **Reversible Fees:** Withdraw during OPEN phase and get 100% refund (fees reversed on withdrawal)

### 🎮 Flexible Architecture

Works with any competition format you can imagine:

- **Entry-Based:** One user can have multiple entries (strategies, lineups, teams)
- **Any Scoring System:** Your oracle reports results - contracts handle payouts
- **Configurable Economics:** Set deposit amounts, fees, LMSR curves per contest
- **Multiple Payouts:** Distribute prizes however you want (60/30/10, winner-take-all, top 10, etc.)
- **Yield Generation:** Idle USDC earns Compound V3 yield for platform treasury
- **Custom Branding:** Deploy tokens with your platform's name and symbol

### ⚡ Instant, Trustless Settlement

No manual calculations, no disputes, no delays:

- **One Transaction Settles Everything:** Single oracle call distributes both competition prizes AND prediction market payouts
- **Three-Layer Architecture:** Layer 0 (Oracle) + Layer 1 (Primary) + Layer 2 (Secondary) unified in one smart contract
- **No Trusted Intermediary:** Smart contracts hold all funds - no platform custodian risk
- **Automated Bonuses:** Popular primary participants automatically earn extra rewards from prediction volume
- **Force Distribution:** After expiry, unclaimed funds auto-pushed to winners (never locked forever)

### 🔒 Secure & Verifiable

All actions transparent and tamper-proof on-chain:

- **Immutable Rules:** Competition parameters locked at deployment
- **Verifiable Deposits:** All stakes visible on-chain
- **Audit Trail:** Every prediction, withdrawal, and claim recorded permanently
- **Reentrancy Protected:** OpenZeppelin security standards throughout
- **Arbitrage-Proof:** No token swaps allowed - prevents market manipulation
- **Refund Guarantees:** Automatic 100% refunds on entry withdrawals (secondary participants protected)

## 🌍 Competition Examples

This infrastructure is **competition-agnostic** - it works with any format that has measurable outcomes:

### Fantasy Sports

- **Golf:** Users draft golfers, compete based on tournament results
- **Football:** Weekly fantasy lineups compete for prizes
- **Basketball:** Season-long leagues with weekly scoring

### Gaming & Esports

- **Battle Royale:** Tournament brackets with elimination rounds
- **MOBA:** Team-based competitions with ranking systems
- **Speedrunning:** Best completion times across multiple runs

### Trading & Finance

- **Paper Trading:** Simulated portfolio competitions
- **Prediction Markets:** Forecast outcomes with real stakes
- **Trading Contests:** Highest returns over set periods

### Creator Economy

- **Streaming:** View count competitions between streamers
- **Content:** Engagement metrics (likes, shares, comments)
- **Challenges:** Achievement-based creator battles

### Custom Formats

- Any competition with:
  - ✅ Multiple independent entries
  - ✅ Measurable outcomes
  - ✅ Ranked results (or binary win/loss)
  - ✅ Trusted oracle to report results

## 🔐 Security Features

✅ **No arbitrage** - Swaps disabled, LMSR only on entry  
✅ **Reentrancy protection** - All external calls guarded  
✅ **Oracle control** - Only oracle can settle contests  
✅ **Deferred fees** - Users can withdraw with full refunds during OPEN phase  
✅ **Winner-take-all** - All collateral goes to winners  
✅ **State validation** - Proper state checks throughout

## 📈 Economics

### Primary Participant Earnings

```
Base prize: From primary participant deposits (net of oracle fee)
Position bonus: 5% of secondary deposits on their entry (allocated per-deposit)
Cross-subsidy bonus: From secondary deposits when primary < 30% target (goes to prize pool)

Oracle fee: 5% deducted at deposit time (NOT at settlement)

Total earnings: Competition winnings + position bonuses (already net of fees)
```

**Oracle Fee Application (At Deposit Time):**

```
Primary deposits (3 participants × 100 each):
├─ Each deposit: 100 tokens → 5% oracle fee = 5 tokens
├─ Net per entry: 95 tokens → primaryPrizePool (with up to 15% cross-subsidy to secondary if above 30% target)
└─ Total net: ~285 tokens in primaryPrizePool (exact amount depends on cross-subsidy)

Secondary deposits (10 participants × 100 each = 1000):
├─ Each deposit: 100 tokens → 5% oracle fee = 5 tokens
├─ Net per deposit: 95 tokens → split as follows:
│   ├─ 5% → primaryPositionSubsidy[entryId] = 4.75 tokens (direct to entry owner)
│   └─ 90.25 tokens → cross-subsidy calculation:
│       ├─ Up to 15% → primaryPrizePoolSubsidy (if primary < 30% target)
│       └─ Remainder → secondaryPrizePool (backs ERC1155 tokens)
└─ Totals: 47.5 to position bonuses, remainder split between pools

Distribution at settlement:
├─ Layer 1 prizes: (primaryPrizePool + primaryPrizePoolSubsidy) split by payoutBps[] ← Performance!
└─ Position bonuses: Already allocated per-entry based on secondary volume ← Popularity!

These can differ! Layer 1 = skill, Position bonuses = entry popularity.
```

**Example:** Entry B wins with high prediction volume (500 tokens bet on them)

```
Competition prize: Based on payoutBps (e.g., 60% of combined pool)
Position bonus: 5% × 500 tokens × 95% (after oracle fee) = 23.75 tokens
Total: Prize + 23.75 tokens bonus!

All amounts already net of oracle fees (deducted at deposit time)
```

### Secondary Participant Earnings

```
Position amount: 100 tokens
Oracle fee: 5 tokens (deducted immediately)
Position bonus to entry owner: 4.75 tokens (5% of 95)
Remaining: 90.25 tokens
  ├─ Cross-subsidy: up to 13.54 tokens (15% max, if primary < 30% target)
  └─ Collateral: remainder (backing your position tokens)
Tokens received: collateral / LMSR_price

If predicted winner:
  Payout = (your tokens / total winning tokens) × total collateral

If predicted loser:
  Payout = 0 (winner-take-all!)
```

**Example:** Picking the winner

```
Invested: 100 tokens
Oracle fee: -5 tokens (deducted at deposit)
Position bonus to entry owner: -4.75 tokens (5%)
Cross-subsidy: -13.54 tokens (if primary below 30% target)
Collateral: ~76.71 tokens (backs your position tokens)

If win (e.g., hold 40% of winning tokens):
  Receive: 40% × (total collateral pool)
  Potential: Significant ROI if picked winner with good odds
```

## 🛠️ Development

### Build

```bash
forge build
```

### Test

```bash
forge test
forge test -vvv  # Verbose
forge test --match-test testFullFlow -vvvv  # Very verbose
```

### Deploy

```bash
# Set environment variables
cp .env.example .env
# Edit .env with your values

# Deploy to testnet
forge script script/Deploy_sepolia.s.sol --rpc-url sepolia --broadcast

# Deploy to mainnet
forge script script/Deploy_base.s.sol --rpc-url base --broadcast
```

---

**For detailed technical documentation, see [README_technical.md](./README_technical.md)**
