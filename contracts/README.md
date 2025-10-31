# Competition + Prediction Market Infrastructure

Universal smart contract system for **skill-based competitions with integrated prediction markets.**

Build prediction markets on top of any competition where:

- **Primary Participants** deposit entry fees and compete for prizes (Layer 1)
- **Secondary Participants** predict on primary positions using dynamic LMSR pricing (Layer 2)
- **Oracle** provides real-world event data and settles both layers in a single transaction (Layer 0)
- **Everyone** benefits from automated, trustless prize distribution

**Use Cases:** Fantasy sports • Gaming tournaments • Trading competitions • Content creator battles • Skill-based challenges • Any measurable competition

## 📚 Table of Contents

- [What This Infrastructure Enables](#-what-this-infrastructure-enables)
- [Competition Examples](#-competition-examples)
- [Contest Lifecycle](#-contest-lifecycle)
- [State Transition Diagram](#-state-transition-diagram)
- [How It Works](#-how-it-works)
- [Economic Model](#-economic-model)
- [Security Features](#-security-features)
- [Economics](#-economics)

**📖 [Contest Technical Reference](./README_contests.md)** - Contracts, API, Deployment, Testing, State Machine, Quick Reference

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

- **Secondary Fees Augment Prizes:** 7.5% goes to competition prize pool (bigger prizes!)
- **Popularity Bonuses:** 7.5% distributed to primary participants based on prediction volume
- **Configurable Oracle Fee:** Platform takes 1-10% for providing infrastructure, deducted at deposit time
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

| Actor                      | Can Do                                | Function                           |
| -------------------------- | ------------------------------------- | ---------------------------------- |
| **Primary Participants**   | Claim single entry payout             | `claimPrimaryPayout(entryId)`      |
| **Secondary Participants** | Check final prices                    | `calculateSecondaryPrice(entryId)` |
| **Secondary Participants** | Claim secondary payout                | `claimSecondaryPayout(entryId)`    |
| **Secondary Participants** | Winners get payout, losers get 0      | Same function                      |
| **Oracle/Admin**           | Distribute after expiry (see Phase 5) | `closeContest()`                   |

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
Primary Participants: Get back full deposit amount
Secondary Participants: Get back 100% of what they deposited (including entry fees!)

Example:
- Secondary participant deposited 100 tokens
- Entry fee was 15 tokens
- If cancelled: Get back full 100 tokens ✅
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
                     │ Pays Layer 1 (Primary) prizes
                     │ Pays Layer 2 (Secondary) bonuses
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

## 🎮 How It Works

### Full User Flow

```
1. User deposits stablecoin (USDC)
   ├─ DepositManager.depositUSDC(100 USDC)
   └─ Receives: 100 platform tokens (1:1 ratio)

2A. User enters as primary participant
   ├─ System generates unique entryId: 12345
   ├─ Contest.addPrimaryPosition(12345) with deposit amount
   └─ Competes for prizes

   OR

2B. User adds secondary position
   ├─ Contest.addSecondaryPosition(entryId, 50 tokens)
   └─ Receives ERC1155 tokens at dynamic LMSR price

3. Competition completes & settles
   ├─ Oracle calls Contest.settleContest(winningEntries, payouts)
   └─ ONE call settles both layers! (only winners needed)

4. Users claim winnings
   ├─ Primary participants: Contest.claimPrimaryPayout(entryId)
   ├─ Secondary participants: Contest.claimSecondaryPayout(entryId)
   └─ Receive platform tokens

5. Convert back to stablecoin
   ├─ DepositManager.withdrawUSDC(100 tokens)
   └─ Receives: 100 USDC (1:1 ratio)
```

## 💰 Economic Model

### Example: 3 primary participants, 10 secondary participants

**Phase 1: Primary Participants Enter**

```
Entry A deposits: 100 tokens → 1% oracle fee = 1 token, 99 to pool
Entry B deposits: 100 tokens → 1% oracle fee = 1 token, 99 to pool
Entry C deposits: 100 tokens → 1% oracle fee = 1 token, 99 to pool
─────────────────────────────────────────────────────────
Oracle fees accumulated: 3 tokens
Layer 1 pool (primaryPrizePool): 297 tokens
```

**Phase 2: Secondary Participants Add Positions**

```
5 people add 100 tokens on Entry B = 500 tokens (50% of volume)
3 people add 100 tokens on Entry A = 300 tokens (30% of volume)
2 people add 100 tokens on Entry C = 200 tokens (20% of volume)
─────────────────────────────────────────
Total secondary deposits: 1,000 tokens

Oracle fee deducted at deposit (1%): 10 tokens → accumulatedOracleFee
Remaining: 990 tokens split three ways:

├─ Prize bonus (7.5% of 990): 74.25 tokens → augments Layer 1 pool
├─ Primary position bonuses (7.5% of 990): 74.25 tokens → split by volume
│   ├─ Entry B: 37.13 tokens (50% of prediction volume) ← Based on popularity!
│   ├─ Entry A: 22.28 tokens (30% of prediction volume)
│   └─ Entry C: 14.84 tokens (20% of prediction volume)
└─ Secondary collateral (85% of 990): 841.5 tokens → backs position tokens
```

**Phase 3: ONE Oracle Call Settles**

```solidity
contest.settleContest(
    [entryB, entryA, entryC],  // Winning entry IDs (only non-zero payouts)
    [6000, 3000, 1000]          // 60%, 30%, 10%
)
// Note: Only pass entries that receive payouts - no zeros needed!
```

**What happens:**

**Note:** Oracle fees (1%) were already deducted at deposit time, so all pools are already net of fees.

1. Calculate Layer 1 pool (already net of oracle fees):

   - Primary deposits: 300 - 3 (1% fee) = 297 tokens
   - Secondary prize bonus: 1000 - 10 (1% fee) = 990 → 7.5% = 74.25 tokens
   - **Layer 1 pool: 371.25 tokens**

2. Calculate Layer 2 bonuses (already net of oracle fees):

   - Secondary deposits: 1000 - 10 (1% fee) = 990 tokens
   - User share (7.5% of 990): 74.25 tokens
   - Split by prediction volume:
     - Entry B: 37.13 tokens (50% of volume)
     - Entry A: 22.28 tokens (30% of volume)
     - Entry C: 14.84 tokens (20% of volume)

3. Distribute Layer 1 prizes (371.25 tokens):

   - Entry B: 222.75 tokens (60% ← Oracle sets based on PERFORMANCE)
   - Entry A: 111.38 tokens (30% ← Oracle sets)
   - Entry C: 37.13 tokens (10% ← Oracle sets)

4. Layer 2 bonuses (74.25 tokens total):

   - Already calculated above, distributed by volume, not performance

   ⚠️ Note: Layer 1 (performance) and Layer 2 (popularity) are independent!
   An unpopular winner gets big Layer 1 prize (60%) but small Layer 2 bonus (20%).

5. Set Layer 2 winner: Entry B (100%), others (0%)

6. Oracle fee already accumulated: 3 (primary) + 10 (secondary) = 13 tokens total

**Phase 4: Users Claim**

Layer 1 (Primary Participants):

```
Entry B owner claims: 222.75 + 37.13 = 259.88 tokens total (160% ROI!)
Entry A owner claims: 111.38 + 22.28 = 133.66 tokens (34% ROI)
Entry C owner claims: 37.13 + 14.84 = 51.97 tokens (-48% but got bonuses!)

Note: All payouts already net of oracle fees (deducted at deposit time)
```

Layer 2 (Secondary Participants):

```
Entry B position holders (winners):
├─ Hold ~515 tokens total
├─ Redeem for: 841.5 tokens (all collateral!)
├─ Invested: 500 tokens
└─ Profit: +341.5 tokens (+68% ROI for picking winner!)

Entry A position holders: 0 tokens (winner-take-all)
Entry C position holders: 0 tokens (winner-take-all)
```

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
Bonus prize: From secondary entry fees (7.5%, net of oracle fee)
Volume bonus: From secondary prediction volume (7.5%, net of oracle fee)

Oracle fee: Deducted at deposit time (NOT at settlement)

Total earnings: Competition winnings + popularity bonuses (already net of fees)
```

**Oracle Fee Application (At Deposit Time):**

```
Primary deposits (3 participants × 100 each):
├─ Each deposit: 100 tokens → 1% oracle fee = 1 token
├─ Net per entry: 99 tokens → primaryPrizePool
└─ Total net: 297 tokens in primaryPrizePool

Secondary deposits (10 participants × 100 each = 1000):
├─ Each deposit: 100 tokens → 1% oracle fee = 1 token
├─ Net per deposit: 99 tokens → split three ways:
│   ├─ 7.5% → primaryPrizePoolSubsidy = 7.425 tokens
│   ├─ 7.5% → primaryPositionSubsidy = 7.425 tokens
│   └─ 85% → secondaryPrizePool = 84.15 tokens
└─ Total: 74.25 to prizes, 74.25 to bonuses, 841.5 to secondary pool

Distribution at settlement (TWO INDEPENDENT calculations):
├─ Layer 1 prizes: 371.25 tokens split by oracle's payoutBps[] ← Performance!
└─ Layer 2 bonuses: 74.25 tokens split by prediction volume ← Popularity!

These percentages can differ! Layer 1 = skill, Layer 2 = popularity.
```

**Example:** Entry B wins with high prediction volume

```
Competition prize: 222.75 tokens (60% of 371.25 pool)
Volume bonus: 37.13 tokens (50% of 74.25 bonus pool - from being popular)
Total: 259.88 tokens on 100 token deposit = 160% ROI!

All amounts already net of oracle fees (deducted at deposit time)
```

### Secondary Participant Earnings

```
Position amount: 100 tokens
Oracle fee: 1 token (deducted immediately)
Secondary fees: 14.85 tokens (7.5% + 7.5% of 99 after oracle fee)
Collateral: 84.15 tokens (backing your position tokens)
Tokens received: 84.15 / LMSR_price

If predicted winner:
  Payout = (your tokens / total winning tokens) × total collateral

If predicted loser:
  Payout = 0 (winner-take-all!)
```

**Example:** Picking the winner

```
Invested: 100 tokens
Oracle fee: -1 token (deducted at deposit)
Secondary fees: -14.85 tokens (distributed to prize pool & primary participants)
Collateral: 84.15 tokens (backs your position tokens)

If win (hold 515/841.5 of tokens):
  Receive: (your % of winning tokens) × 841.5 tokens
  Potential: +42% ROI if others also predicted winner
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
