# Contest Contract

## Purpose

The Contest contract is the core smart contract that implements a combined contest and prediction market system. It manages both primary participants (contestants) and secondary participants (predictors) in a unified three-layer architecture.

## Responsibilities

- Manage contest lifecycle (state machine)
- Handle primary participant deposits and withdrawals
- Implement secondary prediction market with LMSR pricing
- Calculate and distribute prizes
- Manage economic model (fees, bonuses, cross-subsidies)
- Track entry ownership and positions
- Handle claims and payouts

## Key State Variables

### Immutable Parameters
- `paymentToken`: ERC20 token used for deposits
- `paymentTokenDecimals`: ERC20 decimals of `paymentToken` (curve share-unit normalization)
- `oracle`: Address that controls contest state transitions
- `primaryDepositAmount`: Fixed deposit amount for primary participants
- `referralNetworkBps`: Referral network fee in basis points (e.g., 500 = 5% of gross TVL at settle)
- `expiryTimestamp`: Contest expiration timestamp
- `primaryDepositSecondarySubsidyBps`: Portion of each primary deposit credited to secondary TVL
- `referralGraph`: ReferralGraph contract
- `rewardCalculator`: RewardCalculator contract
- `referralGroupId`: Referral group for settlement fee routing

### Mutable State
- `state`: Current contest state (OPEN, ACTIVE, LOCKED, SETTLED, CANCELLED, CLOSED)
- `entries[]`: Array of entry IDs (capped at `MAX_ENTRIES` = 500)
- `entryOwner`: Mapping of entry ID to owner address
- `primaryPrizePool`: Primary participant prize pool
- `secondaryLiquidityPerEntry`: Secondary market liquidity per entry
- `primaryPrizePoolPayouts`: Payout amounts per entry (set at settlement)
- `secondaryWinningEntry`: Winning entry ID for secondary market (set at settlement)

## Key Functions

### Primary Participant Functions

#### `addPrimaryPosition(uint256 entryId)`
- **Purpose**: Join contest as primary participant
- **State**: OPEN only
- **Effects**:
  - Transfers `primaryDepositAmount` from caller
  - Sets `entryOwner[entryId] = caller`
  - Adds entry to `entries[]`
  - Deducts oracle fee (5%)
  - Adds remainder to `primaryPrizePool`
  - Applies cross-subsidy if needed

#### `removePrimaryPosition(uint256 entryId)`
- **Purpose**: Leave contest and get refund
- **State**: OPEN only
- **Effects**:
  - Verifies caller owns entry
  - Transfers full deposit back (including oracle fee)
  - Removes entry from `entries[]`
  - Reverses accounting

### Secondary Participant Functions

#### `addSecondaryPosition(uint256 entryId, uint256 amount)`
- **Purpose**: Add prediction on an entry
- **State**: OPEN or ACTIVE
- **Effects**:
  - Transfers `amount` from caller
  - Calculates LMSR price
  - Mints ERC1155 tokens to caller
  - Deducts oracle fee (5%)
  - Allocates position bonus (5% to entry owner)
  - Calculates cross-subsidy
  - Adds remainder to `secondaryPrizePool`

#### `removeSecondaryPosition(uint256 entryId, uint256 tokens)`
- **Purpose**: Remove prediction and get refund
- **State**: OPEN only
- **Effects**:
  - Burns ERC1155 tokens from caller
  - Calculates refund amount (100% including fees)
  - Transfers refund to caller
  - Reverses accounting

#### `calculateSecondaryPrice(uint256 entryId)`
- **Purpose**: Get current prediction price
- **State**: Any (read-only)
- **Returns**: Current price in payment token units

### Oracle/Admin Functions

#### `activateContest()`
- **Purpose**: Start contest (transition OPEN → ACTIVE)
- **Access**: Oracle only
- **Effects**: Updates state to ACTIVE

#### `lockContest()`
- **Purpose**: Lock secondary positions (transition ACTIVE → LOCKED)
- **Access**: Oracle only
- **Effects**: Updates state to LOCKED

#### `settleContest(uint256[] winningEntries, uint256[] payoutBps)`
- **Purpose**: Settle contest and calculate payouts
- **Access**: Oracle only
- **State**: LOCKED
- **Effects**:
  - Calculates primary payouts based on `payoutBps`
  - Sets `secondaryWinner` to first entry in `winningEntries`
  - Updates state to SETTLED
  - Stores payout amounts in `primaryPrizePoolPayouts`

#### `closeContest()`
- **Purpose**: Force distribution after expiry
- **Access**: Oracle only
- **State**: SETTLED
- **Effects**:
  - Sweeps unclaimed funds to oracle
  - Updates state to CLOSED

#### `cancelContest()`
- **Purpose**: Cancel contest and enable refunds
- **Access**: Oracle only
- **State**: OPEN or ACTIVE (not LOCKED/SETTLED)
- **Effects**: Updates state to CANCELLED

### Claim Functions

#### `claimPrimaryPayout(uint256 entryId)`
- **Purpose**: Claim primary winnings
- **State**: SETTLED
- **Effects**:
  - Transfers prize from `primaryPrizePoolPayouts[entryId]`
  - Transfers position bonus from `primaryPositionSubsidy[entryId]`
  - Marks as claimed

#### `claimSecondaryPayout(uint256 entryId)`
- **Purpose**: Claim secondary winnings
- **State**: SETTLED
- **Effects**:
  - If `entryId == secondaryWinningEntry`:
    - Calculates user's share of that entry's secondary liquidity
    - Transfers share to caller
  - Otherwise: returns 0

## Dependencies

- **Solady ERC1155 / ReentrancyGuard / SafeTransferLib**
- **ReferralGraph + RewardCalculator**: Settlement fee distribution
- **Payment token**: ERC20 for deposits
- **Oracle**: Address that controls state transitions

## Economic Model

### Fee Structure
- **Referral network fee**: `referralNetworkBps` of gross TVL deducted once at `settleContest`
- **Primary→secondary subsidy**: `primaryDepositSecondarySubsidyBps` of each primary deposit

### Payout Structure
- **Primary**: Performance-based prizes via `payoutBps`
- **Secondary**: Winner-take-all pro-rata on the winning entry's secondary liquidity

## Security Considerations

- Reentrancy protection on all external calls
- State checks prevent invalid operations
- Access control on oracle functions
- Immutable parameters prevent changes
- Safe token transfer patterns

