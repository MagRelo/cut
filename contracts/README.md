# Bet the Cut Smart Contracts

This directory contains the smart contracts for the Bet the Cut platform, implementing a simplified token system with yield generation through Compound V3 Comet.

## Contract Architecture

### Core Contracts

1. **PlatformToken.sol** - A simple ERC20 token (CUT) that can be minted and burned by the DepositManager
2. **DepositManager.sol** - Manages USDC deposits, CUT token minting/burning, and yield generation through Compound V3

### Key Design Principles

- **1:1 Conversion**: USDC to CUT tokens maintain a 1:1 ratio
- **Yield Retention**: All yield generated through Compound V3 stays in the DepositManager contract
- **No User Yield Distribution**: Users only get back their original deposit amount, yield is retained by the platform
- **Compound V3 Integration**: Uses Compound V3 Comet for yield generation
- **Simplified Design**: No complex tracking variables, just direct 1:1 conversions

## Contract Functions

### PlatformToken

- `mint(address to, uint256 amount)` - Mint CUT tokens (only callable by DepositManager)
- `burn(address from, uint256 amount)` - Burn CUT tokens (only callable by DepositManager)
- `setDepositManager(address _depositManager)` - Set the DepositManager address (only callable by owner)

### DepositManager

#### User Functions

- `depositUSDC(uint256 amount)` - Deposit USDC and receive CUT tokens (1:1 ratio)
- `withdrawUSDC(uint256 platformTokenAmount)` - Burn CUT tokens and receive USDC back (1:1 ratio)
- `withdrawAll()` - Withdraw all CUT tokens for USDC

#### View Functions

- `getTokenManagerUSDCBalance()` - Get USDC balance in the contract
- `getCompoundUSDCBalance()` - Get USDC balance in Compound V3
- `getTotalAvailableBalance()` - Get total USDC available (contract + Compound)

#### Admin Functions

- `balanceSupply(address to)` - Withdraw excess USDC (yield) while ensuring token supply is backed (only owner)
- `emergencyWithdrawAll(address to)` - Emergency withdraw all available USDC (only owner)

## Decimal Handling

- **USDC**: 6 decimals
- **CUT Token**: 18 decimals
- **Conversion**: 1 USDC = 1 CUT token (with decimal conversion: `amount * 1e12`)

## Yield Generation

1. Users deposit USDC into the DepositManager
2. USDC is automatically supplied to Compound V3 Comet for yield generation
3. Yield accumulates in the Compound V3 position
4. Users can only withdraw their original deposit amount (1:1 ratio)
5. All yield remains in the DepositManager contract for platform use

## Simplified Design

The contracts use a **minimalist approach**:

- **No tracking variables**: No `totalUSDCBalance` or `totalPlatformTokensMinted`
- **Direct 1:1 conversion**: Users get exactly 1 CUT token per 1 USDC deposited
- **Simple withdrawal**: Users get back exactly their original deposit amount
- **Yield retention**: All Compound V3 yield stays in the contract for platform use

### Why This Design?

- **Simplicity**: No complex accounting or yield distribution logic
- **Security**: Fewer state variables mean fewer attack vectors
- **Gas efficiency**: Minimal storage operations
- **Transparency**: Clear 1:1 relationship between USDC and CUT tokens

## Security Features

- **Reentrancy Protection**: All external functions use `nonReentrant` modifier
- **Pause Checks**: Respects Compound V3 pause states
- **Access Control**: Only DepositManager can mint/burn CUT tokens
- **Emergency Functions**: Owner can withdraw funds in emergency situations
- **Input Validation**: Comprehensive parameter checking
- **Return Value Checks**: All external calls validated

## Testing

✅ **All tests passing!** Run the test suite:

```bash
forge test
```

### Test Coverage

- **PlatformToken.t.sol**: 15 tests covering minting, burning, and access control
- **DepositManager.t.sol**: 24 tests covering deposits, withdrawals, yield accumulation, and admin functions

### Test Features

- **Mock Contracts**: Uses MockUSDC and MockCompound for isolated testing
- **Yield Simulation**: MockCompound can simulate yield generation for testing
- **Edge Cases**: Tests cover zero amounts, insufficient balances, and pause states
- **Admin Functions**: Tests owner-only functions and access control

## Deployment

### Environment Variables

Set these environment variables before deployment:

```bash
export PRIVATE_KEY="your_private_key"
export USDC_TOKEN_ADDRESS="usdc_token_address"
export CUSDC_ADDRESS="compound_v3_cusdc_address"
```

### Deploy

```bash
forge script script/Deploy.s.sol --rpc-url <rpc_url> --broadcast
```

## Network Addresses

### Base Mainnet

- **USDC**: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
- **Compound V3 Comet**: 0xb125E6687d4313864e53df431d5425969c15Eb2F

### Base Sepolia (Testnet)

- **USDC**: [Set appropriate testnet address]
- **Compound V3 Comet**: [Set appropriate testnet address]

## Integration with Compound V3

The DepositManager integrates with Compound V3 Comet for yield generation:

- **Supply**: Automatically supplies USDC to Compound V3 when users deposit
- **Withdraw**: Withdraws from Compound V3 when users withdraw their deposits
- **Yield Tracking**: Yield accumulates in Compound V3 position
- **Pause Handling**: Respects Compound V3 pause states for supply and withdraw operations

### Key Integration Points

```solidity
// Compound V3 interface
interface ICErc20 {
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function balanceOf(address owner) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function isSupplyPaused() external view returns (bool);
    function isWithdrawPaused() external view returns (bool);
}
```

For detailed integration information, see `docs/COMPOUND_V3_COMET_INTEGRATION.md`.

## Contract Specifications

The contracts implement the specifications outlined in `contract_spec.txt`:

1. **Escrow System**: Separate from this token system (see EscrowFactory.sol and Escrow.sol)
2. **Platform Token System**: Simple ERC20 with 1:1 USDC conversion
3. **Yield Integration**: Compound V3 Comet integration for yield generation

## Recent Updates

### Testing Improvements

- ✅ Fixed ownership issues in test setup
- ✅ Added proper MockCompound integration for yield simulation
- ✅ All 39 tests now passing
- ✅ Comprehensive test coverage for all contract functions

### Contract Features

- ✅ Simplified 1:1 USDC to CUT token conversion
- ✅ Automatic Compound V3 integration for yield generation
- ✅ Yield retention by platform (no user distribution)
- ✅ Emergency withdrawal capabilities
- ✅ Comprehensive pause state handling

## Security Best Practices

For detailed information about security implementations, see `SECURITY_BEST_PRACTICES.md`.

## License

MIT License

to do:

- handle multiple entries in escrow contract

ideas:

- reformat as option contract - everyone buys no shares against everyone else
