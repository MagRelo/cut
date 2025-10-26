# the Cut - Smart Contracts

Complete fantasy golf contest and prediction market system built on Solidity.

## 🎮 Key Features

### Multiple Entries Per User

Users can join the same contest multiple times with different entries (lineups). Each entry has a unique ID from your database and competes independently.

### Spectator Protection

When an entry withdraws, all spectators who predicted on that entry automatically receive 100% refunds (including fees). No manual action needed!

### Entry-Based Architecture

Everything works with entry IDs, not user addresses. This enables multiple entries per user and cleaner tracking.

**Benefits:**

- 🎯 One user can have multiple entries in same contest
- 🔐 Each entry ID is unique (from your database)
- 💰 Settle with only winners - no zeros needed
- 🎁 Automatic refunds when entries withdraw
- 📊 ERC1155 token ID = entry ID (clean mapping)

## 📦 Contracts

### Token Layer

**`PlatformToken.sol`** - ERC20 CUT token

- Minted 1:1 when users deposit USDC
- Burned 1:1 when users withdraw USDC
- Only DepositManager can mint/burn

**`DepositManager.sol`** - USDC gateway + yield generation

- Users deposit USDC → receive CUT tokens
- Supplies USDC to Compound V3 for yield
- Users can withdraw USDC anytime (1:1 redemption)

### Contest Layer

**`Contest.sol`** - Combined contestant competition + spectator predictions

- **Layer 1:** Contestants deposit CUT and compete for prizes
- **Layer 2:** Spectators predict CUT on contestants with LMSR pricing
- **Settlement:** ONE oracle call distributes both layers

**`ContestFactory.sol`** - Creates Contest instances

- Standardized contest deployment
- Registry of all contests

## 📅 Contest Lifecycle

### Phase 1: OPEN - Contestant Registration & Early Predictions

**State:** `ContestState.OPEN`  
**Predictions:** ✅ Available (early predictions enabled)

| Actor           | Can Do                                  | Function                              |
| --------------- | --------------------------------------- | ------------------------------------- |
| **Contestants** | Join contest with entry ID              | `joinContest(entryId)`                |
| **Contestants** | Leave contest (auto-refunds spectators) | `leaveContest(entryId)`               |
| **Spectators**  | Check prices                            | `calculateEntryPrice(entryId)`        |
| **Spectators**  | Add prediction                          | `addPrediction(entryId, amount)`      |
| **Spectators**  | Withdraw (100% refund)                  | `withdrawPrediction(entryId, tokens)` |
| **Oracle**      | Activate contest                        | `activateContest()`                   |

**State transition:** Oracle calls `activateContest()` → `ACTIVE`

---

### Phase 2: ACTIVE - Contest Running, Predictions Open

**State:** `ContestState.ACTIVE`  
**Predictions:** ✅ Available

| Actor           | Can Do                 | Function                                 |
| --------------- | ---------------------- | ---------------------------------------- |
| **Contestants** | ❌ Cannot join/leave   | -                                        |
| **Spectators**  | Add predictions (LMSR) | `addPrediction(entryId, amount)`         |
| **Spectators**  | Withdraw (100% refund) | `withdrawPrediction(entryId, tokens)`    |
| **Spectators**  | Check prices           | `calculateEntryPrice(entryId)`           |
| **Oracle**      | Close predictions      | `closePredictions()`                     |
| **Oracle**      | Cancel contest         | `cancelContest()`                        |
| **Oracle**      | Settle (if not locked) | `settleContest(winningEntries, payouts)` |

**State transition:** Oracle calls `closePredictions()` → `LOCKED`

---

### Phase 3: LOCKED - Contest Finishing, Predictions Closed

**State:** `ContestState.LOCKED`  
**Predictions:** ❌ Closed

| Actor           | Can Do                 | Function                                     |
| --------------- | ---------------------- | -------------------------------------------- |
| **Contestants** | ❌ Waiting for results | -                                            |
| **Spectators**  | Check prices (locked)  | `calculateEntryPrice(entryId)`               |
| **Spectators**  | ❌ Cannot predict      | -                                            |
| **Spectators**  | ❌ Cannot withdraw     | -                                            |
| **Oracle**      | Settle contest         | `settleContest(winningEntries[], payouts[])` |

**Purpose:** Contest is finishing, outcome not yet certain, but predictions locked to prevent last-second unfair predictions.

**Note:** This phase is optional - oracle can call `settleContest()` directly from ACTIVE state.

**State transition:** Oracle calls `settleContest()` → `SETTLED`

---

### Phase 4: SETTLED - Claiming

**State:** `ContestState.SETTLED`  
**Predictions:** Closed

| Actor           | Can Do                                | Function                         |
| --------------- | ------------------------------------- | -------------------------------- |
| **Contestants** | Claim single entry payout             | `claimEntryPayout(entryId)`      |
| **Contestants** | Claim all entries at once             | `claimAllEntryPayouts()`         |
| **Spectators**  | Check final prices                    | `calculateEntryPrice(entryId)`   |
| **Spectators**  | Claim prediction payout               | `claimPredictionPayout(entryId)` |
| **Spectators**  | Winners get payout, losers get 0      | Same function                    |
| **Oracle**      | Distribute after expiry (see Phase 5) | `distributeExpiredContest()`     |

**State transition:** Oracle calls `distributeExpiredContest()` (after expiry) → `CLOSED`

---

### Phase 5: CLOSED - Force Distribution (After Expiry)

**State:** `ContestState.CLOSED`  
**Trigger:** Oracle calls `distributeExpiredContest()` after contest expiry

| Actor         | Can Do                          | Function |
| ------------- | ------------------------------- | -------- |
| **All Users** | Already received forced payouts | -        |
| **Oracle**    | ❌ No more actions              | -        |

**Purpose:** Prevent funds from being locked forever if users forget to claim.

**How it works:**

- After expiry timestamp, oracle can call `distributeExpiredContest()`
- Automatically pushes all unclaimed payouts to users
- Contestants receive their unclaimed prizes
- Winning spectators receive their unclaimed winnings
- Losing spectators get nothing (winner-take-all already determined)

**Terminal state:** Contest fully closed, all funds distributed.

---

### (Alternative) CANCELLED - Refunds

**State:** `ContestState.CANCELLED`

| Actor           | Can Do                                 | Function                              |
| --------------- | -------------------------------------- | ------------------------------------- |
| **Contestants** | Get full refund (100% of deposit)      | `leaveContest(entryId)`               |
| **Spectators**  | Check prices (locked)                  | `calculateEntryPrice(entryId)`        |
| **Spectators**  | Get full refund (100% including fees!) | `withdrawPrediction(entryId, tokens)` |
| **Oracle**      | ❌ No more actions                     | -                                     |

**Terminal state:** Contest cancelled, all deposits refunded.

**How to get to CANCELLED:**

- Oracle calls `cancelContest()` (anytime before SETTLED - settlement is final!)
- Anyone calls `cancelExpired()` (after expiry timestamp, if not settled)

**Refund guarantee:**

```
Contestants: Get back full contestantDepositAmount
Spectators: Get back 100% of what they deposited (including entry fees!)

Example:
- Spectator deposited 100 CUT
- Entry fee was 15 CUT
- If cancelled: Get back full 100 CUT ✅
```

---

## 🔄 State Transition Diagram

```
                    OPEN
                     │
                     │ Contestants join
                     │ Spectators predict (early predictions!)
                     │ Spectators can withdraw
                     │
                     │ Oracle: activateContest()
                     ▼
                  ACTIVE
                     │
                     │ Spectators continue predicting
                     │ Spectators can withdraw
                     │
                     │ Oracle: closePredictions() [OPTIONAL]
                     ▼
                  LOCKED
                     │
                     │ Contest finishing
                     │ No more predictions/withdrawals
                     │
                     │ Oracle: settleContest(...)
                     │ (Can also call from ACTIVE)
                     │ Pays Layer 1 prizes
                     │ Pays Layer 2 bonuses
                     ▼
                  SETTLED
                     │
                     │ Users claim
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
1. User deposits USDC
   ├─ DepositManager.depositUSDC(100 USDC)
   └─ Receives: 100 CUT tokens

2. User enters contest as contestant
   ├─ Backend generates entryId: 12345
   ├─ Contest.joinContest(12345) with 100 CUT
   └─ Competes for prizes

   OR

   User adds prediction as spectator
   ├─ Contest.addPrediction(entryId, 50 CUT)
   └─ Receives ERC1155 tokens at LMSR price

3. Contest settles
   ├─ Oracle calls Contest.settleContest(winningEntries, payouts)
   └─ ONE call settles everything! (only winners needed)

4. Users claim
   ├─ Contestants: Contest.claimEntryPayout(entryId) or claimAllEntryPayouts()
   ├─ Spectators: Contest.claimPredictionPayout(entryId)
   └─ Receive CUT tokens

5. Convert back to USDC
   ├─ DepositManager.withdrawUSDC(100 CUT)
   └─ Receives: 100 USDC
```

## 💰 Economic Model

### Example: 3 contestants, 10 spectators

**Phase 1: Contestants Enter**

```
User A deposits: 100 CUT
User B deposits: 100 CUT
User C deposits: 100 CUT
─────────────────────────
Layer 1 pool: 300 CUT
```

**Phase 2: Spectators Predict**

```
5 people predict 100 CUT on User B = 500 CUT (50% of volume)
3 people predict 100 CUT on User A = 300 CUT (30% of volume)
2 people predict 100 CUT on User C = 200 CUT (20% of volume)
─────────────────────────────────────────
Total spectator deposits: 1,000 CUT

Entry fees (15%): 150 CUT
├─ Prize bonus: 75 CUT → augments Layer 1 pool
└─ Contestant bonuses: 75 CUT → split by prediction volume
    ├─ User B: 37.50 CUT (50% of prediction volume) ← Based on popularity!
    ├─ User A: 22.50 CUT (30% of prediction volume)
    └─ User C: 15 CUT (20% of prediction volume)

Spectator collateral: 850 CUT (backs tokens)
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

   - Contestant deposits: 300 CUT
   - Prize bonus: 75 CUT
   - Contestant bonuses: 75 CUT
   - **Total: 450 CUT**

2. Apply oracle fee (1%) to ENTIRE pool:

   - Oracle fee: 4.50 CUT
   - **After fee: 445.50 CUT**

3. Distribute Layer 1 prizes (from 375 - 1% = 371.25 CUT):

   - User B: 222.75 CUT (60% ← Oracle sets based on PERFORMANCE)
   - User A: 111.38 CUT (30% ← Oracle sets)
   - User C: 37.13 CUT (10% ← Oracle sets)

4. Distribute Layer 2 bonuses (from 75 - 1% = 74.25 CUT):

   - User B: 37.13 CUT (50% ← Based on PREDICTION VOLUME)
   - User A: 22.28 CUT (30% ← Based on volume)
   - User C: 14.85 CUT (20% ← Based on volume)

   ⚠️ Note: Layer 1 (performance) and Layer 2 (popularity) are independent!
   An unpopular winner gets big Layer 1 prize (60%) but small Layer 2 bonus (20%).

5. Set Layer 2 winner: User B (100%), others (0%)

**Phase 4: Users Claim**

Layer 1 (Contestants):

```
User B claims: 222.75 + 37.13 = 259.88 CUT total (160% ROI!)
User A claims: 111.38 + 22.28 = 133.66 CUT (34% ROI)
User C claims: 37.13 + 14.85 = 51.98 CUT (-48% but got bonuses!)

Note: Oracle fee (1%) applied to both prizes AND bonuses
```

Layer 2 (Spectators):

```
User B predictors (winners):
├─ Hold ~515 tokens total
├─ Redeem for: 850 CUT (all collateral!)
├─ Invested: 500 CUT
└─ Profit: +350 CUT (+70% ROI for picking winner!)

User A predictors: 0 CUT (winner-take-all)
User C predictors: 0 CUT (winner-take-all)
```

## 🔧 Key Features

### LMSR Dynamic Pricing

Spectator predictions use Logarithmic Market Scoring Rule:

```solidity
price = basePrice + (demand × demandSensitivity) / liquidityParameter
```

**Result:**

- Popular contestants = expensive (fewer tokens per CUT)
- Unpopular contestants = cheap (more tokens per CUT)
- Early predictors get better prices
- Market discovers true odds

### Winner-Take-All

Layer 2 spectators use winner-take-all (different from Layer 1):

```
Layer 1 (Contestants): Proportional (60%, 30%, 10%)
Layer 2 (Spectators): Winner-take-all (100%, 0%, 0%)
```

**Why?** Higher stakes = more excitement for spectators!

### Deferred Fee Distribution

Entry fees held until settlement, enabling free withdrawals:

```
addPrediction(contestantId, 100 CUT)
├─ 85 CUT → collateral (backs tokens)
└─ 15 CUT → fees (held, not sent yet)

withdraw() before settlement
└─ Get back: 100 CUT (full refund!)

settleContest() at settlement
├─ Send 75 CUT to prize pool
└─ Send 75 CUT to contestants
```

### No Swaps (Security)

Swaps disabled to prevent arbitrage:

```
❌ BAD (if swaps were enabled):
1. Deposit on cheap contestant ($0.92/token)
2. Swap 1:1 to expensive contestant ($1.40/token)
3. Instant 52% profit (exploit!)

✅ GOOD (current):
1. addPrediction() directly on desired contestant
2. No swaps allowed
3. Arbitrage impossible
```

## 📖 API Reference

### Contest.sol

#### Contestant Functions

```solidity
// Join contest with unique entry ID
function joinContest(uint256 entryId) external
// Requirements: state == OPEN, exact contestantDepositAmount, entryId not used
// Note: Entry ID must be unique (typically generated by your database)

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

#### Oracle Functions

```solidity
// Activate contest (closes contestant registration, predictions continue)
function activateContest() external onlyOracle
// Requirements: state == OPEN, has contestants

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
// Does: Pushes all unclaimed contestant and spectator payouts
```

### ContestFactory.sol

```solidity
// Create new contest
function createContest(
    address paymentToken,     // PlatformToken address
    address oracle,
    uint256 contestantDepositAmount,
    uint256 oracleFee,       // Basis points (max 1000 = 10%)
    uint256 expiry,
    uint256 liquidityParameter,
    uint256 demandSensitivity
) external returns (address)

// Get all contests
function getContests() external view returns (address[])

// Get count
function getContestCount() external view returns (uint256)
```

## 🚀 Deployment

### 1. Deploy Platform (Once)

```solidity
// Deploy CUT token
PlatformToken cut = new PlatformToken("Cut", "CUT");

// Deploy USDC manager
DepositManager dm = new DepositManager(
    usdcAddress,
    address(cut),
    cUSDCAddress  // Compound V3 comet
);

// Connect them
cut.setDepositManager(address(dm));
```

### 2. Deploy ContestFactory (Once)

```solidity
ContestFactory factory = new ContestFactory();
```

### 3. Create Contests (Many Times)

```solidity
address contest = factory.createContest(
    address(cut),         // paymentToken
    oracleAddress,
    100e18,              // 100 CUT per contestant
    100,                 // 1% oracle fee
    block.timestamp + 7 days,
    1000e18,             // LMSR liquidity
    500                  // LMSR sensitivity (5%)
);
```

## 📊 Example Usage

### TypeScript/ethers.js

```typescript
import { ethers } from "ethers";

// 1. User deposits USDC for CUT tokens
await depositManager.depositUSDC(ethers.parseUnits("1000", 6)); // 1000 USDC
// User now has 1000 CUT

// 2. Create a contest
const contest = await contestFactory.createContest(
  platformTokenAddress,
  oracleAddress,
  ethers.parseEther("100"), // 100 CUT per contestant
  100, // 1% fee
  Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
  ethers.parseEther("1000"), // Liquidity
  500 // Sensitivity
);

// 3. Contestants join with entry IDs
const entryId = 12345; // From your database
await cutToken.approve(contest, ethers.parseEther("100"));
await contest.joinContest(entryId);

// 4. Oracle activates
await contest.activateContest();

// 5. Spectators add predictions (using entry IDs directly!)
await cutToken.approve(contest, ethers.parseEther("50"));
await contest.addPrediction(entryId, ethers.parseEther("50")); // Predict on entryId

// 6. Oracle settles (ONE CALL! Only winners needed!)
await contest.settleContest(
  [entry1, entry2, entry3], // Winning entry IDs (no zeros!)
  [6000, 3000, 1000] // 60%, 30%, 10%
);

// 7. Claim prizes
await contest.claimEntryPayout(entryId); // Single entry
// OR
await contest.claimAllEntryPayouts(); // All entries at once

// Spectators claim
await contest.claimPredictionPayout(entryId);

// 8. Convert CUT back to USDC
await depositManager.withdrawUSDC(ethers.parseEther("150"));
// User receives 150 USDC
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

### Contestant Earnings

```
Base prize: From contestant deposits
Bonus prize: From spectator entry fees (7.5%)
Volume bonus: From spectator prediction volume (7.5%)

Oracle fee: Applied to ALL contestant earnings (prizes + bonuses)

Total earnings: (Contest winnings + popularity bonuses) × (1 - oracleFee%)
```

**Oracle Fee Application:**

```
Total pool going to contestants:
├─ Contestant deposits: 300 CUT
├─ Prize bonus (7.5% of spectator deposits): 75 CUT
└─ Volume bonuses (7.5% of spectator deposits): 75 CUT
    Total: 450 CUT

Oracle takes fee from ENTIRE pool:
├─ Oracle fee (1% of 450): 4.50 CUT
└─ Contestants receive: 445.50 CUT

Distribution (TWO INDEPENDENT calculations):
├─ Layer 1 prizes: 371.25 CUT split by oracle's payoutBps[] ← Performance!
└─ Layer 2 bonuses: 74.25 CUT split by prediction volume ← Popularity!

These percentages can differ! Layer 1 = skill, Layer 2 = popularity.
```

**Example:** User B wins with high prediction volume

```
Contest prize: 222.75 CUT (60% of augmented pool, after 1% oracle fee)
Volume bonus: 37.13 CUT (from being popular, after 1% oracle fee)
Total: 259.88 CUT on 100 CUT deposit = 160% ROI!

Oracle fee applies to ALL contestant earnings (prizes + bonuses)
```

### Spectator Earnings

```
Prediction amount: 100 CUT
Entry fee: 15 CUT (non-refundable after settlement)
Collateral: 85 CUT (backing)
Tokens: 85 / LMSR_price

If predicted winner:
  Payout = (your tokens / total winning tokens) × total collateral

If predicted loser:
  Payout = 0 (winner-take-all!)
```

**Example:** Picking the winner

```
Invested: 100 CUT
Entry fee: -15 CUT
Collateral: 85 CUT

If win (hold 515/850 of tokens):
  Receive: (your % of winning tokens) × 850 CUT
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
  ↓ contestants joinContest(entryId)
  ↓ spectators addPrediction(entryId, amount) (early predictions!)
  ↓ oracle activateContest()

ACTIVE
  ↓ spectators addPrediction(entryId, amount) (predictions continue)
  ↓ (optional) spectators withdrawPrediction(entryId, tokens)
  ↓ (optional) oracle closePredictions()

LOCKED [OPTIONAL]
  ↓ contest finishes (no more predictions/withdrawals)
  ↓ oracle settleContest(winningEntries, payouts)

SETTLED
  ↓ contestants claimEntryPayout(entryId) or claimAllEntryPayouts()
  ↓ spectators claimPredictionPayout(entryId)
  ↓ (after expiry) oracle distributeExpiredContest()

CLOSED
  ↓ all unclaimed funds pushed to users
  ↓ contest fully closed

(OR - from OPEN/ACTIVE only)

CANCELLED
  ↓ refunds available (cannot cancel after LOCKED/SETTLED)
  ↓ contestants leaveContest(entryId)
  ↓ spectators withdrawPrediction(entryId, tokens)
```

## 🎯 Quick Reference

### For Contestants

| Want to...         | Call...                     |
| ------------------ | --------------------------- |
| Join contest       | `joinContest(entryId)`      |
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

### For Oracle

| Want to...                     | Call...                                  | When...                        |
| ------------------------------ | ---------------------------------------- | ------------------------------ |
| Activate contest               | `activateContest()`                      | After contestants join         |
| Close predictions              | `closePredictions()`                     | Before contest finishes        |
| Settle everything              | `settleContest(winningEntries, payouts)` | After contest finishes         |
| Cancel                         | `cancelContest()`                        | If contest needs cancellation  |
| Distribute unclaimed (expired) | `distributeExpiredContest()`             | After expiry (if users forgot) |

**Note:** `settleContest()` only requires winning entries - no need to include zeros!

## 📄 License

MIT

## 👨‍💻 Author

MagRelo
