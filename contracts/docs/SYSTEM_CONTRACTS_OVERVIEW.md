# System Contracts Overview

## High-Level System Summary

The Bet the Cut platform is a decentralized betting and fantasy sports system built on blockchain technology that enables users to participate in golf competitions and place real-money bets. The system consists of a suite of smart contracts that manage user deposits, escrow services for betting pools, yield generation through DeFi protocols, and platform token economics. The architecture separates concerns between payment processing (USDC), platform token management, escrow services for betting pools, and yield generation through Compound V3 integration. Users can deposit USDC to receive platform tokens, participate in betting pools through escrow contracts, and earn yield on their deposits while maintaining the ability to withdraw their funds at any time.

## Contract Descriptions

### PaymentToken.sol

**Purpose**: Development token that simulates USDC functionality for testing purposes.

**Key Functionality**:

- ERC20 token with 6 decimal precision (matching USDC)
- Mintable and burnable by owner for testing
- Provides USDC-like interface for development environment
- Should not be deployed in production (use actual USDC instead)

**Key Functions**:

- `mint(address to, uint256 amount)` - Creates new tokens (owner only)
- `burn(address from, uint256 amount)` - Destroys tokens (owner only)
- `decimals()` - Returns 6 (matching USDC precision)

### PlatformToken.sol

**Purpose**: The native platform token (CUT) that represents user deposits and platform participation.

**Key Functionality**:

- ERC20 token with 18 decimal precision
- Only mintable/burnable by the TokenManager contract
- Represents user's stake in the platform
- Used for platform governance and utility

**Key Functions**:

- `setTokenManager(address _tokenManager)` - Sets the TokenManager address (owner only)
- `mint(address to, uint256 amount)` - Mints tokens (TokenManager only)
- `burn(address from, uint256 amount)` - Burns tokens (TokenManager only)

### TokenManager.sol (Treasury.sol)

**Purpose**: Core contract that manages USDC deposits, platform token minting/burning, and yield generation through Compound V3.

**Key Functionality**:

- Converts USDC deposits to platform tokens at dynamic exchange rates
- Integrates with Compound V3 for yield generation
- Tracks user yield accumulation and distribution
- Manages platform token supply and USDC reserves
- Provides emergency withdrawal capabilities

**Key Functions**:

- `depositUSDC(uint256 amount)` - Deposits USDC and mints platform tokens
- `withdrawUSDC(uint256 platformTokenAmount)` - Burns platform tokens and returns USDC
- `withdrawAll()` - Withdraws all platform tokens plus accumulated yield
- `claimYield()` - Claims accumulated yield without burning platform tokens
- `getClaimableYield(address user)` - Returns user's claimable yield amount
- `getExchangeRate()` - Returns current USDC to platform token exchange rate
- `emergencyWithdrawUSDC(address to, uint256 amount)` - Emergency withdrawal (owner only)
- `getTokenManagerBalance()` - Returns total USDC balance including yield
- `getPlatformTokenSupply()` - Returns total platform tokens minted
- `getTokenManagerUSDCBalance()` - Returns USDC balance in TokenManager
- `getCompoundUSDCBalance()` - Returns USDC balance in Compound V3
- `getTotalAvailableBalance()` - Returns total available USDC (TokenManager + Compound)

### EscrowFactory.sol

**Purpose**: Factory contract that creates and manages individual escrow contracts for betting pools.

**Key Functionality**:

- Creates new escrow contracts for different betting events
- Manages approved oracle addresses
- Tracks all created escrow contracts
- Controls platform token address for escrow contracts

**Key Functions**:

- `createEscrow(string name, uint256 depositAmount, uint256 endTime, address oracle)` - Creates new escrow contract
- `addOracle(address oracle)` - Adds approved oracle address (owner only)
- `removeOracle(address oracle)` - Removes oracle address (owner only)
- `setPlatformToken(address _newPlatformToken)` - Updates platform token address (owner only)
- `getEscrows()` - Returns all created escrow contracts

### Escrow.sol

**Purpose**: Individual betting pool contract that manages participant deposits, betting logic, and payout distribution.

**Key Functionality**:

- Manages participant deposits and withdrawals
- Handles betting pool lifecycle (OPEN → IN_PROGRESS → SETTLED/CANCELLED)
- Distributes payouts based on oracle-provided results
- Supports emergency withdrawals and cancellation
- Limits maximum participants (2000) per pool

**Key Functions**:

- `deposit()` - Allows participants to join the betting pool
- `withdraw()` - Allows participants to exit before pool closes
- `closeDeposits()` - Closes pool to new deposits (oracle only)
- `distribute(uint256[] _payoutBasisPoints)` - Distributes payouts based on results (oracle only)
- `emergencyWithdraw()` - Emergency withdrawal after end time
- `cancelAndRefund()` - Cancels pool and refunds all participants (owner only)
- `getParticipantsCount()` - Returns number of participants

## Contract Interactions

### Primary Interaction Flow

1. **User Deposit Flow**:

   - User calls `TokenManager.depositUSDC()` with USDC
   - TokenManager transfers USDC from user and deposits to Compound V3
   - TokenManager mints platform tokens to user via `PlatformToken.mint()`
   - Exchange rate updates based on total value (USDC + yield)

2. **Betting Pool Creation Flow**:

   - Oracle calls `EscrowFactory.createEscrow()` with pool parameters
   - Factory creates new `Escrow` contract with specified parameters
   - Factory tracks the new escrow in its array

3. **Betting Pool Participation Flow**:

   - User approves platform tokens for escrow contract
   - User calls `Escrow.deposit()` to join betting pool
   - Escrow transfers platform tokens from user to escrow contract
   - User's participation is tracked in escrow state

4. **Betting Pool Settlement Flow**:

   - Oracle calls `Escrow.closeDeposits()` to close pool
   - Oracle calls `Escrow.distribute()` with payout basis points
   - Escrow calculates payouts and transfers platform tokens to winners
   - Any remaining tokens go to oracle

5. **Yield Generation and Claiming**:
   - Compound V3 generates yield on USDC deposits
   - Users can call `TokenManager.claimYield()` to claim accumulated yield
   - Users can call `TokenManager.withdrawAll()` to withdraw deposit + yield
   - TokenManager burns platform tokens and returns USDC + yield

### Contract Dependencies

- **TokenManager** depends on:

  - `PlatformToken` (for minting/burning)
  - `PaymentToken`/USDC (for deposits)
  - Compound V3 `ICErc20` (for yield generation)

- **EscrowFactory** depends on:

  - `Escrow` (creates instances)
  - `PlatformToken` (sets as token for escrows)

- **Escrow** depends on:

  - `PlatformToken` (for deposits/payouts)
  - Oracle address (for pool management)

- **PlatformToken** depends on:
  - `TokenManager` (for minting/burning permissions)

### Security Considerations

1. **Access Control**: All critical functions are protected by `onlyOwner` or `onlyOracle` modifiers
2. **Reentrancy Protection**: Uses OpenZeppelin's `ReentrancyGuard` for state-changing functions
3. **Checks-Effects-Interactions**: Follows CEI pattern to prevent reentrancy attacks
4. **Oracle Management**: Only approved oracles can manage escrow pools
5. **Emergency Functions**: Owner can cancel escrows and perform emergency withdrawals
6. **Precision Handling**: Uses higher precision calculations to avoid rounding errors
7. **Balance Validation**: Validates sufficient balances before transfers
8. **Decimal Handling**: Properly handles 6-decimal USDC and 18-decimal PlatformToken conversions

### State Management

- **Escrow States**: OPEN → IN_PROGRESS → SETTLED/CANCELLED
- **Token Exchange Rates**: Dynamic based on total value (USDC + yield)
- **Yield Tracking**: Per-user accumulation with global rate updates
- **Participant Management**: O(1) removal with index tracking

### Key Implementation Details

- **Compound V3 Integration**: Uses real Compound V3 Comet interface with `balanceOf()` returning underlying balance directly
- **Yield Calculation**: Tracks yield per token and user-specific accumulation
- **Decimal Precision**: All calculations properly handle 6-decimal USDC and 18-decimal PlatformToken
- **Exchange Rate**: Calculated as `(totalValue * 1e18) / totalPlatformTokensMinted` with proper decimal scaling
- **Emergency Withdrawal**: Only TokenManager owner can call emergency withdrawal (not PaymentToken owner)

This architecture provides a robust, secure, and scalable foundation for the Bet the Cut platform's betting and yield generation functionality.
