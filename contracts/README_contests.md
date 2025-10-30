# Technical Reference

Complete technical documentation for the Competition + Prediction Market smart contract infrastructure.

> **Overview Documentation:** For high-level concepts, use cases, and economic model, see [README.md](./README.md)

## 📚 Table of Contents

- [Token Flow & Distribution](#-token-flow--distribution)
- [Contracts](#-contracts)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Example Usage](#-example-usage)
- [Testing](#-testing)
- [State Machine](#-state-machine)
- [Quick Reference](#-quick-reference)
- [License](#-license)
- [About](#-about)
- [Author](#-author)

## 💰 Token Flow & Distribution

Understanding how tokens move through the system during key actions:

### addPrediction(entryId, amount)

When a spectator makes a prediction, their tokens are distributed as follows:

```
Spectator sends 100 tokens:
├─ 7.5 tokens → Prize Pool Bonus (prizeShareBps, augments Layer 1)
│               └─ Added to competitor prize pool (prize bonus)
│
├─ 7.5 tokens → Entry Owner Bonus (userShareBps)
│               └─ Paid to entry owner at settlement (popularity bonus)
│
└─ 85 tokens → Spectator Market Pool (collateral)
                └─ Winning spectators claim from here after settlement
```

**Key Points:**

- Fees split between prize pool (prizeShareBps) and entry bonuses (userShareBps)
- Example shows 7.5% each, but both are configurable per contest
- Remaining collateral (~85%) backs the prediction market
- Oracle fee (e.g., 1%) is NOT taken here - it's deducted at settlement
- Spectator receives ERC1155 tokens representing their position
- LMSR pricing determines how many prediction tokens they receive

### joinContest(entryId)

When a competitor joins the contest, their deposit is allocated:

```
Competitor deposits 100 tokens:
└─ 100 tokens → Prize Pool (for competitor payouts)
                └─ Distributed to winners at settlement based on payoutBps[]
```

**Key Points:**

- Full deposit goes to prize pool (no fees on entry)
- Prize pool distributed at settlement according to `payoutBps` array
- Winners can claim prizes after settlement

### settleContest(winningEntries[], payoutBps[])

At settlement, fees and distributions are handled deterministically with no dust left behind:

```
LAYER 1 (Competitors):
Competitor Deposits + Prize Pool Bonus (prizeShare)
├─ Oracle Fee on Layer 1 → Sent to oracle
└─ Remaining funds → Distributed by payoutBps
   ├─ Winner 1 (60%)
   ├─ Winner 2 (30%)
   └─ Winner 3 (10%)

Entry Owner Bonuses (userShare) → Fee applied per bonus, then paid
├─ Bonus Fee (1% example) → Sent to oracle
└─ Bonus After Fee → Sent to entry owners immediately

LAYER 2 (Spectators):
Spectator Market Pool (collateral) → Winner-take-all
└─ All spectators who predicted on winningEntries[0] split 100% of pool
   (proportional to their prediction token holdings)
```

**Key Points:**

- Oracle fee is assessed on both components:
  - Layer 1 pool (deposits + prize pool bonus)
  - Entry owner bonuses (fee withheld per-entry before paying each bonus)
- Entry bonuses are paid out immediately to entry owners after their per-bonus fee
- Competitor prizes use flexible payout structure (basis points)
- Spectator market is winner-take-all: only first entry in `winningEntries[]` wins
- Users must call `claimEntryPayout()` or `claimPredictionPayout()` to receive funds
- Unclaimed funds can be distributed by oracle after expiry

### Special Case: No Winning ERC1155 Supply

If no spectators hold tokens for `winningEntries[0]` at settlement (i.e., `netPosition[winningEntries[0]] == 0`), the entire `predictionPrizePool` is redistributed to Layer 1 winners proportionally to `payoutBps[]` (with any integer remainder sent to the top winner). This zeroes the spectator pool and sends the extra directly to the winning entry owners. This applies whether spectators predicted only losing entries or there were simply no spectator predictions on the winner.

### Dust Handling Guarantees

- Layer 1 distributions and entry bonuses use integer math; any remainder from spectator redistribution without winning supply is sent to the top winner.
- Spectator claims decrement `predictionPrizePool` per claim. When the last holder claims, any residual rounding dust is swept to the last claimant, leaving the contract with zero leftover spectator collateral.

## 🧮 Funds Flow & Accounting Invariants

This section formalizes the accounting and provides formulas used to verify tests.

Definitions (contract state variables in `Contest.sol`):

- `contestPrizePool`: sum of contestant deposits via `joinContest`
- `contestPrizePoolSubsidy`: sum of prize share from spectator deposits
- `contestantSubsidy[entryId]`: sum of per-entry spectator bonus share
- `predictionPrizePool`: spectator collateral (backs ERC1155 redemption)
- `oracleFeeBps`: fee bps applied at settlement to Layer 1 pool and to each entry bonus
- `BPS_DENOMINATOR = 10000`

Spectator deposit split for amount `A` with `prizeShareBps = p`, `userShareBps = u`:

- `prizeShare = A * p / 10000` → accumulates in `contestPrizePoolSubsidy`
- `entryBonus = A * u / 10000` → accumulates in `contestantSubsidy[entryId]`
- `collateral = A - (prizeShare + entryBonus)` → accumulates in `predictionPrizePool`

Settlement (Layer 1):

- `totalPoolL1 = contestPrizePool + contestPrizePoolSubsidy`
- `oracleFeeL1 = totalPoolL1 * oracleFeeBps / 10000`
- `layer1AfterFee = totalPoolL1 - oracleFeeL1`
- Payouts: For each winning entry i: `entryPayout[i] = layer1AfterFee * payoutBps[i] / 10000`
- Entry bonuses: For each entry e:
  - `bonusFee[e] = contestantSubsidy[e] * oracleFeeBps / 10000`
  - `bonusAfterFee[e] = contestantSubsidy[e] - bonusFee[e]`
  - Oracle receives `Σ bonusFee[e]`

Settlement (Layer 2):

- Winner-take-all: Only `winningEntries[0]` is payable
- Let `supply = uint256(netPosition[winner])` (total ERC1155 supply for winner)
- A spectator with balance `b` on winner receives: `b * predictionPrizePool / supply`

Refunds and reversals:

- In `OPEN` or `CANCELLED`, spectator withdrawals fully reverse all three components: prizeShare, entryBonus, and collateral.
- `leaveContest` in `OPEN` auto-refunds all spectators who predicted on the withdrawn entry (burns their tokens and returns their full deposit, reversing accounting).

Invariants:

- Conservation before settlement: contract balance in payment token equals `contestPrizePool + contestPrizePoolSubsidy + Σ(contestantSubsidy) + predictionPrizePool`.
- At settlement, Layer 1 distributions plus `oracleFeeL1` equal `totalPoolL1` (and `Σ bonusAfterFee + Σ bonusFee = Σ contestantSubsidy`).
- Post-claims (or after `distributeExpiredContest`), contract payment token balance should be 0.
- If there is no ERC1155 supply for the winning entry at settlement, `predictionPrizePool` is set to 0 and the same amount is distributed to Layer 1 winners per `payoutBps[]`.

## 📐 Worked Examples

Example parameters:

- `contestantDepositAmount = 100e18`
- `oracleFeeBps = 100` (1%)
- `prizeShareBps = 750` (7.5%)
- `userShareBps = 750` (7.5%)

Scenario: 3 contestants join (300e18 total). One spectator deposits 100e18 on Entry #1.

- Spectator split: prizeShare=7.5, entryBonus=7.5, collateral=85 (all in e18)
- Before settlement:
  - `contestPrizePool = 300`
  - `contestPrizePoolSubsidy = 7.5`
  - `contestantSubsidy[1] = 7.5`, others 0 → `Σ = 7.5`
  - `predictionPrizePool = 85`

Settlement with `payoutBps = [6000, 3000, 1000]` and `winningEntries = [1,2,3]`:

- `totalPoolL1 = 300 + 7.5 = 307.5`
- `oracleFeeL1 = 3.075`
- `layer1AfterFee = 304.425`
- Entry payouts (rounded down by Solidity math):
  - #1: 60% → 182.655
  - #2: 30% → 91.3275
  - #3: 10% → 30.4425
- Bonuses:
  - Bonus fee on #1: `7.5 * 1% = 0.075` → oracle
  - Bonus after fee to #1: `7.425`
- Spectator winner-take-all:
  - If Entry #1 is first in `winningEntries`, all `predictionPrizePool (85)` goes to token holders of entry #1, prorata by supply.

## 🧪 Test Scenarios Matrix

We validate these cases in `contracts/test/Contest_Accounting.t.sol`:

- Common
  - S1: 3 competitors, no spectators. Settle [10000] → 100% to winner, oracle fee from competitor pool only.
  - S2: 3 competitors, spectators on multiple entries, no withdrawals. Settle [6000, 3000, 1000] → verify fee, prizes, bonuses, spectator pot.
  - S3: Spectators withdraw during OPEN → full reversals, then settle.
  - S4: Oracle closes predictions (LOCKED) then settle; no withdrawals allowed.
- Edge
  - E1: Entry withdrawn in OPEN auto-refunds its spectators; settle remaining entries.
  - E2: Zero spectators; varied payout splits; check only deposits fund prizes.
  - E3: All spectators on a losing entry → if there is ERC1155 supply on `winningEntries[0]`, winners split the prediction pool; if there is no winning supply, the entire prediction pool is redistributed to Layer 1 winners per `payoutBps[]` (with any remainder to the top winner).
  - E4: No winning ERC1155 supply (corner): ensure no spectator payout and no stranded funds.
  - E5: High oracle fee (e.g., 10%) and extreme bps splits; rounding safety.
  - E6: `distributeExpiredContest` pushes unclaimed payouts and ends with CLOSED state.

### cancelContest()

If a contest is cancelled, all deposits are returned:

```
CANCELLED STATE:
├─ Competitors → 100% refund via leaveContest(entryId)
└─ Spectators → 100% refund via withdrawPrediction(entryId, tokens)
                (includes original deposit + oracle fee)
```

**Key Points:**

- Spectators get full refunds including the oracle fee
- All tokens returned to original depositors
- Can only cancel before settlement (settlement is final)

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

// Withdraw prediction before competition starts (100% refund!)
function withdrawPrediction(uint256 entryId, uint256 tokenAmount) external
// Requirements: state == OPEN or CANCELLED
// Returns: Full original deposit (including entry fee)
// Note: NOT allowed in ACTIVE state - predictions locked once competition starts

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
    500                   // LMSR sensitivity (5%)
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

## 📝 State Machine

```
Contest States:

OPEN
  ↓ competitors joinContest(entryId)
  ↓ spectators addPrediction(entryId, amount) (early predictions!)
  ↓ spectators withdrawPrediction(entryId, tokens) (free exit)
  ↓ oracle activateContest()

ACTIVE
  ↓ competition in progress
  ↓ spectators addPrediction(entryId, amount) (predictions continue)
  ↓ NO withdrawals allowed (predictions locked in)
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

| Want to...                      | Call...                               | When...                |
| ------------------------------- | ------------------------------------- | ---------------------- |
| Add prediction                  | `addPrediction(entryId, amount)`      | OPEN or ACTIVE states  |
| Withdraw prediction (free exit) | `withdrawPrediction(entryId, tokens)` | OPEN or CANCELLED only |
| Claim winnings                  | `claimPredictionPayout(entryId)`      | After SETTLED          |
| Check price                     | `calculateEntryPrice(entryId)`        | Anytime                |

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
