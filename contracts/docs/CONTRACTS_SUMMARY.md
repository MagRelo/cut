# Smart Contracts Summary

## Overview

This document provides a comprehensive overview of the smart contract system for the Bet the Cut platform. The system consists of 4 main contracts that work together to provide fantasy golf competitions and real-money betting functionality.

---

## Contract Architecture

### Core Contracts

#### 1. **PlatformToken (CUT)**

**File:** `src/PlatformToken.sol`  
**Author:** MagRelo  
**Purpose:** ERC20 token for the platform with restricted minting/burning capabilities

**Key Features:**

- Standard ERC20 functionality (transfer, approve, allowance)
- Restricted minting/burning to `DepositManager` only
- Configurable `DepositManager` address
- Access control via `onlyDepositManager` modifier

**Key Functions:**

- `setDepositManager(address)` - Sets the deposit manager (owner only)
- `mint(address, uint256)` - Mints tokens (deposit manager only)
- `burn(address, uint256)` - Burns tokens (deposit manager only)

**Events:**

- `DepositManagerSet(address)`
- `DepositManagerMint(address, uint256)`
- `DepositManagerBurn(address, uint256)`

---

#### 2. **DepositManager**

**File:** `src/DepositManager.sol`  
**Author:** MagRelo  
**Purpose:** Manages USDC deposits, CUT token minting/burning, and yield generation through Compound V3

**Key Features:**

- USDC deposit/withdrawal management
- 1:1 USDC to CUT token conversion
- Compound V3 Comet integration for yield generation
- Emergency withdrawal capabilities
- Pause/unpause functionality for Compound operations

**Key Functions:**

- `depositUSDC(uint256)` - Deposit USDC and mint CUT tokens
- `withdrawUSDC(uint256)` - Withdraw USDC and burn CUT tokens
- `withdrawAll()` - Withdraw all USDC for a user
- `balanceSupply(address)` - Supply USDC to Compound for yield
- `emergencyWithdrawAll()` - Emergency withdrawal (owner only)

**Events:**

- `USDCDeposited(address, uint256, uint256)` - USDC deposited, CUT minted
- `USDCWithdrawn(address, uint256, uint256)` - USDC withdrawn, CUT burned
- `YieldAccumulated(uint256)` - Yield accumulated from Compound

---

#### 3. **Escrow**

**File:** `src/Escrow.sol`  
**Author:** MagRelo  
**Purpose:** Generic escrow contract for managing deposits and payouts with oracle control

**Key Features:**

- Flexible payment token support (USDC, DAI, etc.)
- Oracle-controlled payout distribution
- Participant management with efficient O(1) removal
- Expiry-based withdrawal mechanism
- Reentrancy protection

**States:**

- `OPEN` - Accepting deposits
- `IN_PROGRESS` - Deposits closed, awaiting oracle distribution
- `SETTLED` - Payouts distributed
- `CANCELLED` - Escrow cancelled and refunded

**Key Functions:**

- `deposit()` - Deposit required amount
- `withdraw()` - Withdraw deposit before closure
- `closeDeposits()` - Close deposits (oracle only)
- `distribute(uint256[])` - Distribute payouts (oracle only)
- `cancelAndRefund()` - Cancel escrow (oracle only)
- `expiredEscrowWithdraw()` - Withdraw after expiry

**Events:**

- `EscrowDeposited(address, uint256)`
- `EscrowWithdrawn(address)`
- `DepositsClosed()`
- `PayoutsDistributed(uint256[])`
- `ExpiredEscrowWithdraw(address, uint256)`
- `EscrowCancelled()`

---

#### 4. **EscrowFactory**

**File:** `src/EscrowFactory.sol`  
**Author:** MagRelo  
**Purpose:** Factory contract for creating and managing Escrow contracts

**Key Features:**

- Creates Escrow contracts with consistent configuration
- Maintains registry of all created escrows
- Flexible payment token and parameter configuration
- Centralized escrow management

**Key Functions:**

- `createEscrow(...)` - Create new escrow with parameters
- `getEscrows()` - Get all created escrow addresses

**Events:**

- `EscrowCreated(address, address, uint256)` - Escrow created, host, deposit amount

---

## Mock Contracts

#### **MockUSDC**

**File:** `src/mocks/MockUSDC.sol`  
**Purpose:** Mock USDC token for testing

#### **MockCompound**

**File:** `src/mocks/MockCompound.sol`  
**Purpose:** Mock Compound V3 Comet for testing

---

## Security Features

### Access Control

- **Ownable Pattern:** PlatformToken and DepositManager use OpenZeppelin's Ownable
- **Role-based Access:** Oracle-only functions in Escrow
- **Restricted Minting:** Only DepositManager can mint/burn CUT tokens

### Reentrancy Protection

- **ReentrancyGuard:** Escrow and DepositManager use OpenZeppelin's ReentrancyGuard
- **Checks-Effects-Interactions:** Proper ordering in critical functions

### Validation

- **Parameter Validation:** All contracts validate input parameters
- **State Validation:** Functions check appropriate contract states
- **Balance Validation:** Sufficient balance checks before operations

---

## Integration Points

### USDC → CUT Conversion

1. User deposits USDC to `DepositManager`
2. `DepositManager` mints equivalent CUT tokens
3. USDC is supplied to Compound V3 for yield generation

### Escrow Creation & Management

1. `EscrowFactory` creates new `Escrow` contracts
2. Participants deposit to escrow
3. Oracle controls payout distribution
4. Factory maintains registry of all escrows

### Yield Generation

1. `DepositManager` supplies USDC to Compound V3
2. Yield accumulates over time
3. Users can withdraw yield along with principal

---

## Testing Coverage

### Test Files

- **PlatformToken.t.sol** - 39 tests covering ERC20 functionality and restricted operations
- **DepositManager.t.sol** - 39 tests covering USDC management and Compound integration
- **Escrow.t.sol** - 36 tests covering escrow lifecycle and oracle operations
- **EscrowFactory.t.sol** - 21 tests covering factory functionality

### Test Categories

- Constructor and initialization tests
- Core functionality tests
- Edge cases and error conditions
- Integration scenarios
- Gas optimization tests
- Security and reentrancy tests

**Total: 135 tests** with comprehensive coverage across all contracts.

---

## Deployment Considerations

### Dependencies

- OpenZeppelin Contracts (Ownable, ReentrancyGuard, ERC20)
- Compound V3 Comet Protocol (for yield generation)
- USDC token contract

### Configuration

- Oracle addresses for escrows
- Compound V3 Comet contract addresses
- USDC token addresses (mainnet/testnet)
- Initial CUT token parameters

### Deployment Scripts

- **Deploy_sepolia.s.sol** - Deploys all contracts with mock USDC/Compound for testing
- **Deploy_base.s.sol** - Deploys all contracts with real USDC/Compound for Base mainnet

### Gas Optimization

- Efficient participant management in Escrow
- Optimized loops and storage patterns
- Minimal external calls where possible

---

## Future Enhancements

### Potential Additions

- Multi-signature oracle support
- Advanced yield strategies
- Cross-chain functionality
- Enhanced analytics and reporting
- Governance mechanisms for parameter updates

### Scalability Considerations

- Batch operations for multiple escrows
- Optimized gas usage for high-frequency operations
- Layer 2 integration possibilities
