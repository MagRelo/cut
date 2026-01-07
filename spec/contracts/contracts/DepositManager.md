# DepositManager Contract

## Purpose

The DepositManager contract manages USDC deposits, CUT token minting/burning, and yield generation through Compound V3. It implements a 1:1 USDC to CUT token conversion system where all yield generated stays with the platform.

## Responsibilities

- Accept USDC deposits from users
- Mint CUT tokens 1:1 with USDC deposits
- Supply USDC to Compound V3 for yield generation
- Handle withdrawals (burn CUT, return USDC)
- Manage yield (platform keeps all yield)
- Provide emergency withdrawal capabilities
- Handle Compound V3 pause states gracefully

## Key State Variables

### Immutable
- `usdcToken`: USDC token contract address
- `platformToken`: CUT platform token contract address
- `cUSDC`: Compound V3 Comet contract address

### Mutable
- `totalDeposited`: Total USDC deposited (for accounting)
- `totalMinted`: Total CUT tokens minted (for accounting)

## Key Functions

### User Functions

#### `deposit(uint256 usdcAmount)`
- **Purpose**: Deposit USDC and receive CUT tokens
- **Effects**:
  - Transfers USDC from caller
  - Attempts to supply to Compound V3
  - If Compound unavailable, stores in contract
  - Mints CUT tokens 1:1 to caller
  - Updates accounting
  - Emits `USDCDeposited` event

#### `withdraw(uint256 cutAmount)`
- **Purpose**: Burn CUT tokens and receive USDC
- **Effects**:
  - Burns CUT tokens from caller
  - Withdraws USDC from Compound V3 (or contract balance)
  - Transfers USDC to caller
  - Updates accounting
  - Emits `USDCWithdrawn` event

### Owner Functions

#### `withdrawExcessUSDC(address recipient, uint256 amount)`
- **Purpose**: Withdraw yield (excess USDC)
- **Access**: Owner only
- **Effects**:
  - Calculates excess (total in Compound + contract - total deposited)
  - Withdraws from Compound if needed
  - Transfers to recipient
  - Emits `BalanceSupply` event

#### `emergencyWithdraw()`
- **Purpose**: Emergency withdrawal of all funds
- **Access**: Owner only
- **Effects**:
  - Withdraws all USDC from Compound
  - Transfers all USDC to owner
  - Emits `EmergencyWithdraw` event

## Compound V3 Integration

### Supply Flow
1. Check if Compound is paused
2. If not paused, supply USDC to Compound V3
3. If paused or supply fails, store USDC in contract
4. Mint CUT tokens regardless

### Withdraw Flow
1. Calculate needed USDC amount
2. Try to withdraw from Compound V3
3. If insufficient, withdraw from contract balance
4. Transfer USDC to user

### Yield Management
- All yield stays in Compound V3 or contract
- Owner can withdraw excess via `withdrawExcessUSDC()`
- Users always get 1:1 conversion regardless of yield

## Dependencies

- **PlatformToken**: CUT token contract (mints/burns)
- **USDC**: ERC20 token for deposits
- **Compound V3 (cUSDC)**: For yield generation
- **OpenZeppelin**: ReentrancyGuard, Ownable, SafeERC20

## Events

### `USDCDeposited`
- Emitted when user deposits USDC
- Parameters: user, usdcAmount, platformTokensMinted

### `USDCWithdrawn`
- Emitted when user withdraws USDC
- Parameters: user, platformTokensBurned, usdcAmount

### `BalanceSupply`
- Emitted when owner withdraws yield
- Parameters: owner, recipient, amount, timestamp

### `EmergencyWithdraw`
- Emitted on emergency withdrawal
- Parameters: owner, amount, timestamp

## Design Decisions

### Why 1:1 Conversion?
- Simple and predictable for users
- No price volatility concerns
- Easy to understand
- Platform benefits from yield, not users

### Why Compound V3?
- Industry-standard yield generation
- Automatic yield accrual
- No manual management needed
- Graceful fallback if unavailable

### Why Keep Yield?
- Platform needs revenue source
- Users get simple 1:1 conversion
- Yield is platform's value proposition
- No complex distribution needed

## Security Considerations

- Reentrancy protection on all external calls
- Owner-only functions for yield withdrawal
- Safe token transfer patterns
- Graceful handling of Compound pause states
- Emergency withdrawal capability

