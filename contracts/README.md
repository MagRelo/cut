# Competition + Prediction Market Infrastructure

Universal smart contract system for **skill-based competitions with integrated prediction markets.**

Build prediction markets on top of any competition where:

- **Competitors** deposit entry fees and compete for prizes
- **Spectators** predict on competitors using dynamic LMSR pricing
- **Oracle** settles both layers in a single transaction
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

### 🎯 Engage Spectators Financially

Transform passive viewers into active participants with skin in the game:

- **Prediction Markets:** Spectators predict on competitors using dynamic LMSR pricing
- **Real Stakes:** Put money behind predictions - winners take all collateral
- **Price Discovery:** Market-driven odds reveal true competitor rankings
- **Early Advantage:** First predictors get better prices (incentivizes early engagement)
- **Safe Withdrawals:** 100% refunds during OPEN phase (change your mind before competition starts)

### 💰 Aligned Incentives

Smart fee structure benefits all participants:

- **Spectator Fees Augment Prizes:** 7.5% goes to competition prize pool (bigger prizes!)
- **Popularity Bonuses:** 7.5% distributed to competitors based on prediction volume
- **Configurable Oracle Fee:** Platform takes 1-10% for providing infrastructure
- **No Hidden Costs:** All fees transparent and enforced by smart contract
- **Deferred Fee Collection:** Fees only collected at settlement (enables free withdrawals in OPEN phase)

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
- **Two-Layer Economy:** Layer 1 (competition) + Layer 2 (predictions) unified in one smart contract
- **No Trusted Intermediary:** Smart contracts hold all funds - no platform custodian risk
- **Automated Bonuses:** Popular competitors automatically earn extra rewards from prediction volume
- **Force Distribution:** After expiry, unclaimed funds auto-pushed to winners (never locked forever)

### 🔒 Secure & Verifiable

All actions transparent and tamper-proof on-chain:

- **Immutable Rules:** Competition parameters locked at deployment
- **Verifiable Deposits:** All stakes visible on-chain
- **Audit Trail:** Every prediction, withdrawal, and claim recorded permanently
- **Reentrancy Protected:** OpenZeppelin security standards throughout
- **Arbitrage-Proof:** No token swaps allowed - prevents market manipulation
- **Refund Guarantees:** Automatic 100% refunds on entry withdrawals (spectators protected)

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

### Phase 1: OPEN - Registration & Early Predictions

**State:** `ContestState.OPEN`  
**Predictions:** ✅ Available (early predictions enabled)

| Actor            | Can Do                                  | Function                              |
| ---------------- | --------------------------------------- | ------------------------------------- |
| **Competitors**  | Join contest with entry ID              | `joinContest(entryId)`                |
| **Competitors**  | Leave contest (auto-refunds spectators) | `leaveContest(entryId)`               |
| **Spectators**   | Check prices                            | `calculateEntryPrice(entryId)`        |
| **Spectators**   | Add prediction                          | `addPrediction(entryId, amount)`      |
| **Spectators**   | Withdraw (100% refund)                  | `withdrawPrediction(entryId, tokens)` |
| **Oracle/Admin** | Activate contest                        | `activateContest()`                   |

**State transition:** Oracle calls `activateContest()` → `ACTIVE`

---

### Phase 2: ACTIVE - Competition Running, Predictions Open

**State:** `ContestState.ACTIVE`  
**Predictions:** ✅ Available  
**Withdrawals:** ❌ NOT allowed (predictions locked in once competition starts)

| Actor            | Can Do                 | Function                                 |
| ---------------- | ---------------------- | ---------------------------------------- |
| **Competitors**  | ❌ Cannot join/leave   | -                                        |
| **Spectators**   | Add predictions (LMSR) | `addPrediction(entryId, amount)`         |
| **Spectators**   | ❌ Cannot withdraw     | -                                        |
| **Spectators**   | Check prices           | `calculateEntryPrice(entryId)`           |
| **Oracle/Admin** | Close predictions      | `closePredictions()`                     |
| **Oracle/Admin** | Cancel contest         | `cancelContest()`                        |
| **Oracle/Admin** | Settle (if not locked) | `settleContest(winningEntries, payouts)` |

**State transition:** Oracle calls `closePredictions()` → `LOCKED`

**Note:** Once the contest is activated, spectators can still add new predictions but CANNOT withdraw existing predictions. This prevents unfair behavior as the competition progresses and outcomes become clearer.

---

### Phase 3: LOCKED - Competition Finishing, Predictions Closed

**State:** `ContestState.LOCKED`  
**Predictions:** ❌ Closed

| Actor            | Can Do                 | Function                                     |
| ---------------- | ---------------------- | -------------------------------------------- |
| **Competitors**  | ❌ Waiting for results | -                                            |
| **Spectators**   | Check prices (locked)  | `calculateEntryPrice(entryId)`               |
| **Spectators**   | ❌ Cannot predict      | -                                            |
| **Spectators**   | ❌ Cannot withdraw     | -                                            |
| **Oracle/Admin** | Settle contest         | `settleContest(winningEntries[], payouts[])` |

**Purpose:** Competition is finishing, outcome not yet certain, but predictions locked to prevent last-second unfair predictions.

**Note:** This phase is optional - oracle can call `settleContest()` directly from ACTIVE state.

**State transition:** Oracle calls `settleContest()` → `SETTLED`

---

### Phase 4: SETTLED - Claiming

**State:** `ContestState.SETTLED`  
**Predictions:** Closed

| Actor            | Can Do                                | Function                         |
| ---------------- | ------------------------------------- | -------------------------------- |
| **Competitors**  | Claim single entry payout             | `claimEntryPayout(entryId)`      |
| **Competitors**  | Claim all entries at once             | `claimAllEntryPayouts()`         |
| **Spectators**   | Check final prices                    | `calculateEntryPrice(entryId)`   |
| **Spectators**   | Claim prediction payout               | `claimPredictionPayout(entryId)` |
| **Spectators**   | Winners get payout, losers get 0      | Same function                    |
| **Oracle/Admin** | Distribute after expiry (see Phase 5) | `distributeExpiredContest()`     |

**State transition:** Oracle calls `distributeExpiredContest()` (after expiry) → `CLOSED`

---

### Phase 5: CLOSED - Force Distribution (After Expiry)

**State:** `ContestState.CLOSED`  
**Trigger:** Oracle calls `distributeExpiredContest()` after contest expiry

| Actor            | Can Do                          | Function |
| ---------------- | ------------------------------- | -------- |
| **All Users**    | Already received forced payouts | -        |
| **Oracle/Admin** | ❌ No more actions              | -        |

**Purpose:** Prevent funds from being locked forever if users forget to claim.

**How it works:**

- After expiry timestamp, oracle can call `distributeExpiredContest()`
- Automatically pushes all unclaimed payouts to users
- Competitors receive their unclaimed prizes
- Winning spectators receive their unclaimed winnings
- Losing spectators get nothing (winner-take-all already determined)

**Terminal state:** Contest fully closed, all funds distributed.

---

### (Alternative) CANCELLED - Refunds

**State:** `ContestState.CANCELLED`

| Actor            | Can Do                                 | Function                              |
| ---------------- | -------------------------------------- | ------------------------------------- |
| **Competitors**  | Get full refund (100% of deposit)      | `leaveContest(entryId)`               |
| **Spectators**   | Check prices (locked)                  | `calculateEntryPrice(entryId)`        |
| **Spectators**   | Get full refund (100% including fees!) | `withdrawPrediction(entryId, tokens)` |
| **Oracle/Admin** | ❌ No more actions                     | -                                     |

**Terminal state:** Contest cancelled, all deposits refunded.

**How to get to CANCELLED:**

- Oracle calls `cancelContest()` (anytime before SETTLED - settlement is final!)
- Anyone calls `cancelExpired()` (after expiry timestamp, if not settled)

**Refund guarantee:**

```
Competitors: Get back full deposit amount
Spectators: Get back 100% of what they deposited (including entry fees!)

Example:
- Spectator deposited 100 tokens
- Entry fee was 15 tokens
- If cancelled: Get back full 100 tokens ✅
```

---

## 🔄 State Transition Diagram

```
                    OPEN
                     │
                     │ Competitors join
                     │ Spectators predict (early predictions!)
                     │ Spectators can withdraw (free exit)
                     │
                     │ Oracle: activateContest()
                     ▼
                  ACTIVE
                     │
                     │ Competition in progress
                     │ Spectators continue predicting
                     │ NO withdrawals (predictions locked in)
                     │
                     │ Oracle: closePredictions() [OPTIONAL]
                     ▼
                  LOCKED
                     │
                     │ Competition finishing
                     │ No more predictions/withdrawals
                     │
                     │ Oracle: settleContest(...)
                     │ (Can also call from ACTIVE)
                     │ Pays Layer 1 prizes
                     │ Pays Layer 2 bonuses
                     ▼
                  SETTLED
                     │
                     │ Users claim payouts
                     │ whenever ready
                     │
                     │ (After expiry)
                     │ Oracle: distributeExpiredContest()
                     │ Pushes unclaimed payouts
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

2A. User enters as competitor
   ├─ System generates unique entryId: 12345
   ├─ Contest.joinContest(12345) with deposit amount
   └─ Competes for prizes

   OR

2B. User predicts as spectator
   ├─ Contest.addPrediction(entryId, 50 tokens)
   └─ Receives ERC1155 tokens at dynamic LMSR price

3. Competition completes & settles
   ├─ Oracle calls Contest.settleContest(winningEntries, payouts)
   └─ ONE call settles both layers! (only winners needed)

4. Users claim winnings
   ├─ Competitors: Contest.claimEntryPayout(entryId) or claimAllEntryPayouts()
   ├─ Spectators: Contest.claimPredictionPayout(entryId)
   └─ Receive platform tokens

5. Convert back to stablecoin
   ├─ DepositManager.withdrawUSDC(100 tokens)
   └─ Receives: 100 USDC (1:1 ratio)
```

## 💰 Economic Model

### Example: 3 competitors, 10 spectators

**Phase 1: Competitors Enter**

```
Entry A deposits: 100 tokens
Entry B deposits: 100 tokens
Entry C deposits: 100 tokens
─────────────────────────
Layer 1 pool: 300 tokens
```

**Phase 2: Spectators Predict**

```
5 people predict 100 tokens on Entry B = 500 tokens (50% of volume)
3 people predict 100 tokens on Entry A = 300 tokens (30% of volume)
2 people predict 100 tokens on Entry C = 200 tokens (20% of volume)
─────────────────────────────────────────
Total spectator deposits: 1,000 tokens

Entry fees (15%): 150 tokens
├─ Prize bonus: 75 tokens → augments Layer 1 pool
└─ Competitor bonuses: 75 tokens → split by prediction volume
    ├─ Entry B: 37.50 tokens (50% of prediction volume) ← Based on popularity!
    ├─ Entry A: 22.50 tokens (30% of prediction volume)
    └─ Entry C: 15 tokens (20% of prediction volume)

Spectator collateral: 850 tokens (backs tokens)
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

1. Calculate total pool:

   - Competitor deposits: 300 tokens
   - Prize bonus: 75 tokens
   - Competitor bonuses: 75 tokens
   - **Total: 450 tokens**

2. Apply oracle fee (1%) to ENTIRE pool:

   - Oracle fee: 4.50 tokens
   - **After fee: 445.50 tokens**

3. Distribute Layer 1 prizes (from 375 - 1% = 371.25 tokens):

   - Entry B: 222.75 tokens (60% ← Oracle sets based on PERFORMANCE)
   - Entry A: 111.38 tokens (30% ← Oracle sets)
   - Entry C: 37.13 tokens (10% ← Oracle sets)

4. Distribute Layer 2 bonuses (from 75 - 1% = 74.25 tokens):

   - Entry B: 37.13 tokens (50% ← Based on PREDICTION VOLUME)
   - Entry A: 22.28 tokens (30% ← Based on volume)
   - Entry C: 14.85 tokens (20% ← Based on volume)

   ⚠️ Note: Layer 1 (performance) and Layer 2 (popularity) are independent!
   An unpopular winner gets big Layer 1 prize (60%) but small Layer 2 bonus (20%).

5. Set Layer 2 winner: Entry B (100%), others (0%)

**Phase 4: Users Claim**

Layer 1 (Competitors):

```
Entry B owner claims: 222.75 + 37.13 = 259.88 tokens total (160% ROI!)
Entry A owner claims: 111.38 + 22.28 = 133.66 tokens (34% ROI)
Entry C owner claims: 37.13 + 14.85 = 51.98 tokens (-48% but got bonuses!)

Note: Oracle fee (1%) applied to both prizes AND bonuses
```

Layer 2 (Spectators):

```
Entry B predictors (winners):
├─ Hold ~515 tokens total
├─ Redeem for: 850 tokens (all collateral!)
├─ Invested: 500 tokens
└─ Profit: +350 tokens (+70% ROI for picking winner!)

Entry A predictors: 0 tokens (winner-take-all)
Entry C predictors: 0 tokens (winner-take-all)
```

## 🔐 Security Features

✅ **No arbitrage** - Swaps disabled, LMSR only on entry  
✅ **Reentrancy protection** - All external calls guarded  
✅ **Oracle control** - Only oracle can settle contests  
✅ **Deferred fees** - Users can withdraw with full refunds during OPEN phase  
✅ **Winner-take-all** - All collateral goes to winners  
✅ **State validation** - Proper state checks throughout

## 📈 Economics

### Competitor Earnings

```
Base prize: From competitor deposits
Bonus prize: From spectator entry fees (7.5%)
Volume bonus: From spectator prediction volume (7.5%)

Oracle fee: Applied to ALL competitor earnings (prizes + bonuses)

Total earnings: (Competition winnings + popularity bonuses) × (1 - oracleFee%)
```

**Oracle Fee Application:**

```
Total pool going to competitors:
├─ Competitor deposits: 300 tokens
├─ Prize bonus (7.5% of spectator deposits): 75 tokens
└─ Volume bonuses (7.5% of spectator deposits): 75 tokens
    Total: 450 tokens

Oracle takes fee from ENTIRE pool:
├─ Oracle fee (1% of 450): 4.50 tokens
└─ Competitors receive: 445.50 tokens

Distribution (TWO INDEPENDENT calculations):
├─ Layer 1 prizes: 371.25 tokens split by oracle's payoutBps[] ← Performance!
└─ Layer 2 bonuses: 74.25 tokens split by prediction volume ← Popularity!

These percentages can differ! Layer 1 = skill, Layer 2 = popularity.
```

**Example:** Entry B wins with high prediction volume

```
Competition prize: 222.75 tokens (60% of augmented pool, after 1% oracle fee)
Volume bonus: 37.13 tokens (from being popular, after 1% oracle fee)
Total: 259.88 tokens on 100 token deposit = 160% ROI!

Oracle fee applies to ALL competitor earnings (prizes + bonuses)
```

### Spectator Earnings

```
Prediction amount: 100 tokens
Entry fee: 15 tokens (non-refundable after settlement)
Collateral: 85 tokens (backing)
Tokens received: 85 / LMSR_price

If predicted winner:
  Payout = (your tokens / total winning tokens) × total collateral

If predicted loser:
  Payout = 0 (winner-take-all!)
```

**Example:** Picking the winner

```
Invested: 100 tokens
Entry fee: -15 tokens (distributed to prize pool & competitors)
Collateral: 85 tokens

If win (hold 515/850 of tokens):
  Receive: (your % of winning tokens) × 850 tokens
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
