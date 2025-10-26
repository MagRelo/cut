# Competition + Prediction Market Infrastructure

Universal smart contract system for **skill-based competitions with integrated prediction markets.**

Build prediction markets on top of any competition where:

- **Competitors** deposit entry fees and compete for prizes
- **Spectators** predict on competitors using dynamic LMSR pricing
- **Oracle** settles both layers in a single transaction
- **Everyone** benefits from automated, trustless prize distribution

**Use Cases:** Fantasy sports • Gaming tournaments • Trading competitions • Content creator battles • Skill-based challenges • Any measurable competition

## ⚡ What This Infrastructure Enables

### 🎯 Engage Spectators Financially

Transform passive viewers into active participants with skin in the game:

- **Prediction Markets:** Spectators predict on competitors using dynamic LMSR pricing
- **Real Stakes:** Put money behind predictions - winners take all collateral
- **Price Discovery:** Market-driven odds reveal true competitor rankings
- **Early Advantage:** First predictors get better prices (incentivizes early engagement)
- **Safe Withdrawals:** 100% refunds before settlement (no lock-in risk)

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

### 🎮 Flexible Architecture

Works with any competition format you can imagine:

- **Entry-Based:** One user can have multiple entries (strategies, lineups, teams)
- **Any Scoring System:** Your oracle reports results - contracts handle payouts
- **Configurable Economics:** Set deposit amounts, fees, LMSR curves per contest
- **Multiple Payouts:** Distribute prizes however you want (60/30/10, winner-take-all, top 10, etc.)
- **Yield Generation:** Idle USDC earns Compound V3 yield for platform treasury
- **Custom Branding:** Deploy tokens with your platform's name and symbol

### 💰 Aligned Incentives

Smart fee structure benefits all participants:

- **Spectator Fees Augment Prizes:** 7.5% goes to competition prize pool (bigger prizes!)
- **Popularity Bonuses:** 7.5% distributed to competitors based on prediction volume
- **Configurable Oracle Fee:** Platform takes 1-10% for providing infrastructure
- **No Hidden Costs:** All fees transparent and enforced by smart contract
- **Deferred Fee Collection:** Fees only collected at settlement (enables free withdrawals)

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

## 📦 Contracts

### Token Layer

**`PlatformToken.sol`** - ERC20 platform token

- Minted 1:1 when users deposit stablecoin (USDC)
- Burned 1:1 when users withdraw stablecoin
- Only DepositManager can mint/burn
- Customizable name/symbol for your platform

**`DepositManager.sol`** - Stablecoin gateway + yield generation

- Users deposit USDC → receive platform tokens (1:1 ratio)
- Supplies USDC to Compound V3 for yield
- Users can withdraw USDC anytime (1:1 redemption)
- Yield stays with platform (treasury)

### Contest Layer

**`Contest.sol`** - Combined competition + prediction market

- **Layer 1:** Competitors deposit tokens and compete for prizes
- **Layer 2:** Spectators predict on competitors using LMSR pricing
- **Settlement:** ONE oracle call distributes both layers
- **Flexible:** Works with any competition format that has measurable outcomes

**`ContestFactory.sol`** - Creates Contest instances

- Standardized contest deployment
- Registry of all contests
- Configurable parameters per competition type

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

| Actor            | Can Do                 | Function                                 |
| ---------------- | ---------------------- | ---------------------------------------- |
| **Competitors**  | ❌ Cannot join/leave   | -                                        |
| **Spectators**   | Add predictions (LMSR) | `addPrediction(entryId, amount)`         |
| **Spectators**   | Withdraw (100% refund) | `withdrawPrediction(entryId, tokens)`    |
| **Spectators**   | Check prices           | `calculateEntryPrice(entryId)`           |
| **Oracle/Admin** | Close predictions      | `closePredictions()`                     |
| **Oracle/Admin** | Cancel contest         | `cancelContest()`                        |
| **Oracle/Admin** | Settle (if not locked) | `settleContest(winningEntries, payouts)` |

**State transition:** Oracle calls `closePredictions()` → `LOCKED`

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
                     │ Spectators can withdraw
                     │
                     │ Oracle: activateContest()
                     ▼
                  ACTIVE
                     │
                     │ Competition in progress
                     │ Spectators continue predicting
                     │ Spectators can withdraw
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

## 📖 API Reference

### Contest.sol

#### Competitor Functions

```solidity
// Join contest with unique entry ID
function joinContest(uint256 entryId) external
// Requirements: state == OPEN, exact deposit amount, entryId not used
// Note: Entry ID must be unique (generated by your system/database)

// Leave contest before start (automatically refunds spectators!)
function leaveContest(uint256 entryId) external
// Requirements: state == OPEN or CANCELLED, owns entry
// Note: All spectators who predicted on this entry get 100% refunds

// Claim single entry prize after settlement
function claimEntryPayout(uint256 entryId) external
// Requirements: state == SETTLED, owns entry, has payout

// Claim all entry prizes at once (convenience function)
function claimAllEntryPayouts() external
// Requirements: state == SETTLED, has at least one payout
// Note: Claims all entries owned by msg.sender in one transaction
```

#### Spectator Functions

```solidity
// Add prediction on an entry (LMSR pricing)
function addPrediction(uint256 entryId, uint256 amount) external
// Requirements: state == OPEN or ACTIVE, entry exists and not withdrawn
// Returns: ERC1155 tokens (token ID = entry ID)
// Price: Dynamic based on demand (LMSR)

// Withdraw prediction before settlement (100% refund!)
function withdrawPrediction(uint256 entryId, uint256 tokenAmount) external
// Requirements: state == OPEN, ACTIVE, or CANCELLED
// Returns: Full original deposit (including entry fee)

// Check current LMSR price for an entry
function calculateEntryPrice(uint256 entryId) public view returns (uint256)
// Returns: Current price per token (increases with demand)

// Claim prediction winnings after settlement
function claimPredictionPayout(uint256 entryId) external
// Requirements: state == SETTLED, holds tokens for entryId
// Payout: Winner-take-all (100% to winners, 0% to losers)
```

#### Oracle/Admin Functions

```solidity
// Activate contest (closes registration, predictions continue)
function activateContest() external onlyOracle
// Requirements: state == OPEN, has at least one entry

// Close predictions window (prevent last-second predictions) [OPTIONAL]
function closePredictions() external onlyOracle
// Requirements: state == ACTIVE

// Settle contest (ONE call does everything!)
function settleContest(
    uint256[] calldata winningEntries,
    uint256[] calldata payoutBps
) external onlyOracle
// Requirements: state == ACTIVE or state == LOCKED
// Note: Only include entries with payouts > 0 (no zeros needed!)
// Note: First entry in array = winner for spectator market
// Does: Pays Layer 1 prizes + bonuses, resolves Layer 2 market
// Example: settleContest([entry1, entry2], [6000, 4000]) - entries not listed get 0%

// Cancel contest (enables refunds)
function cancelContest() external onlyOracle
// Requirements: state != SETTLED and state != CLOSED
// Note: Cannot cancel after settlement - settlement is final

// Distribute all unclaimed payouts after expiry
function distributeExpiredContest() external onlyOracle
// Requirements: state == SETTLED, block.timestamp >= expiryTimestamp
// Does: Pushes all unclaimed competitor and spectator payouts
```

### ContestFactory.sol

```solidity
// Create new contest
function createContest(
    address paymentToken,        // Platform token address
    address oracle,              // Oracle/admin address
    uint256 competitorDepositAmount, // Required deposit per entry
    uint256 oracleFee,           // Basis points (max 1000 = 10%)
    uint256 expiry,              // Expiry timestamp
    uint256 liquidityParameter,  // LMSR liquidity parameter
    uint256 demandSensitivity    // LMSR demand sensitivity (BPS)
) external returns (address)

// Get all contests
function getContests() external view returns (address[])

// Get total contest count
function getContestCount() external view returns (uint256)
```

## 🚀 Deployment

### 1. Deploy Platform (Once)

```solidity
// Deploy platform token with custom name/symbol
PlatformToken token = new PlatformToken("Your Platform", "SYMBOL");

// Deploy USDC deposit manager
DepositManager dm = new DepositManager(
    usdcAddress,      // USDC token address
    address(token),   // Your platform token
    cUSDCAddress      // Compound V3 comet address
);

// Connect them
token.setDepositManager(address(dm));
```

### 2. Deploy ContestFactory (Once)

```solidity
ContestFactory factory = new ContestFactory();
```

### 3. Create Contests (Many Times)

```solidity
address contest = factory.createContest(
    address(token),       // Platform token
    oracleAddress,        // Your oracle/admin address
    100e18,               // 100 tokens per entry
    100,                  // 1% oracle fee (100 basis points)
    block.timestamp + 7 days, // Expiry: 7 days
    1000e18,              // LMSR liquidity parameter
    500                   // LMSR sensitivity (5% = 500 bps)
);
```

## 📊 Example Usage

### TypeScript/ethers.js

```typescript
import { ethers } from "ethers";

// 1. User deposits USDC for platform tokens
await depositManager.depositUSDC(ethers.parseUnits("1000", 6)); // 1000 USDC
// User now has 1000 platform tokens

// 2. Create a contest
const contest = await contestFactory.createContest(
  platformTokenAddress, // Your platform token
  oracleAddress, // Your oracle/admin
  ethers.parseEther("100"), // 100 tokens per entry
  100, // 1% oracle fee
  Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days expiry
  ethers.parseEther("1000"), // LMSR liquidity
  500 // LMSR sensitivity (5%)
);

// 3. Competitors join with entry IDs
const entryId = 12345; // From your system/database
await platformToken.approve(contest, ethers.parseEther("100"));
await contest.joinContest(entryId);

// 4. Oracle activates contest
await contest.activateContest();

// 5. Spectators add predictions (using entry IDs directly!)
await platformToken.approve(contest, ethers.parseEther("50"));
await contest.addPrediction(entryId, ethers.parseEther("50")); // Predict on entryId

// 6. Oracle settles (ONE CALL! Only winners needed!)
await contest.settleContest(
  [entry1, entry2, entry3], // Winning entry IDs (no zeros!)
  [6000, 3000, 1000] // 60%, 30%, 10%
);

// 7. Users claim winnings
// Competitors claim
await contest.claimEntryPayout(entryId); // Single entry
// OR
await contest.claimAllEntryPayouts(); // All entries at once

// Spectators claim
await contest.claimPredictionPayout(entryId);

// 8. Convert platform tokens back to USDC
await depositManager.withdrawUSDC(ethers.parseEther("150"));
// User receives 150 USDC (1:1 ratio)
```

## 🧪 Testing

```bash
# Run all tests
forge test

# Run specific test suite
forge test --match-path "test/Contest.t.sol"
forge test --match-path "test/ContestFactory.t.sol"

# Verbose output
forge test -vvv
```

**Current test status:**

```
✅ Contest.t.sol: 15 tests including:
   - Full contest flow
   - Early predictions
   - LMSR pricing
   - Prediction window control
   - Cancellation & refunds
   - Distribute expired contest (7 tests)
✅ ContestFactory.t.sol: 2/2 passing
✅ PlatformToken.t.sol: All passing
✅ DepositManager.t.sol: All passing

Total: 100% passing
```

## 🔐 Security Features

✅ **No arbitrage** - Swaps disabled, LMSR only on entry  
✅ **Reentrancy protection** - All external calls guarded  
✅ **Oracle control** - Only oracle can settle contests  
✅ **Deferred fees** - Users can withdraw with full refunds  
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

## 📝 State Machine

```
Contest States:

OPEN
  ↓ competitors joinContest(entryId)
  ↓ spectators addPrediction(entryId, amount) (early predictions!)
  ↓ oracle activateContest()

ACTIVE
  ↓ competition in progress
  ↓ spectators addPrediction(entryId, amount) (predictions continue)
  ↓ (optional) spectators withdrawPrediction(entryId, tokens)
  ↓ (optional) oracle closePredictions()

LOCKED [OPTIONAL]
  ↓ competition finishes (no more predictions/withdrawals)
  ↓ oracle settleContest(winningEntries, payouts)

SETTLED
  ↓ competitors claimEntryPayout(entryId) or claimAllEntryPayouts()
  ↓ spectators claimPredictionPayout(entryId)
  ↓ (after expiry) oracle distributeExpiredContest()

CLOSED
  ↓ all unclaimed funds pushed to users
  ↓ contest fully closed

(OR - from OPEN/ACTIVE only)

CANCELLED
  ↓ refunds available (cannot cancel after LOCKED/SETTLED)
  ↓ competitors leaveContest(entryId)
  ↓ spectators withdrawPrediction(entryId, tokens)
```

## 🎯 Quick Reference

### For Competitors

| Want to...         | Call...                     |
| ------------------ | --------------------------- |
| Join competition   | `joinContest(entryId)`      |
| Leave before start | `leaveContest(entryId)`     |
| Claim single prize | `claimEntryPayout(entryId)` |
| Claim all prizes   | `claimAllEntryPayouts()`    |

### For Spectators

| Want to...          | Call...                               |
| ------------------- | ------------------------------------- |
| Add prediction      | `addPrediction(entryId, amount)`      |
| Withdraw prediction | `withdrawPrediction(entryId, tokens)` |
| Claim winnings      | `claimPredictionPayout(entryId)`      |
| Check price         | `calculateEntryPrice(entryId)`        |

### For Oracle/Admin

| Want to...                     | Call...                                  | When...                        |
| ------------------------------ | ---------------------------------------- | ------------------------------ |
| Activate contest               | `activateContest()`                      | After competitors join         |
| Close predictions              | `closePredictions()`                     | Before competition finishes    |
| Settle everything              | `settleContest(winningEntries, payouts)` | After competition finishes     |
| Cancel                         | `cancelContest()`                        | If contest needs cancellation  |
| Distribute unclaimed (expired) | `distributeExpiredContest()`             | After expiry (if users forgot) |

**Note:** `settleContest()` only requires winning entries - no need to include zeros!

## 📄 License

MIT

## 💡 About

This infrastructure is completely **generic and reusable**. The contracts contain no domain-specific logic - they work with any competition format.

The name "the Cut" refers to one specific implementation (fantasy golf), but the smart contracts themselves are **competition-agnostic** and can power:

- Sports prediction platforms
- Gaming tournament systems
- Trading competitions
- Creator challenges
- Any skill-based competition with measurable outcomes

**Core Principle:** Your backend determines the competition rules and scoring. The smart contracts handle deposits, predictions, settlement, and payouts - the same way for every competition type.

## 👨‍💻 Author

MagRelo
