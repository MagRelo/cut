# Contracts Layer Overview

## Purpose

The contracts layer implements the core blockchain functionality for Bet the Cut:

- **Contest Management**: Smart contracts for creating and managing fantasy golf contests
- **Prediction Markets**: Secondary market for betting on contest outcomes using LMSR pricing
- **Token Management**: Platform token (CUT) minting, burning, and USDC deposit management
- **Economic Model**: Fee structures, cross-subsidies, and payout mechanisms

## Key Components

### Core Contracts

1. **Contest.sol** - Main contest contract

   - Three-layer architecture (Oracle, Primary, Secondary)
   - State machine (OPEN → ACTIVE → LOCKED → SETTLED → CLOSED)
   - Primary participant deposits and prize distribution
   - Secondary prediction market with LMSR pricing
   - Cross-subsidy mechanism for pool balancing

2. **ContestFactory.sol** - Factory for creating Contest contracts

   - Centralized contest creation
   - Automatic liquidity parameter calculation
   - Contest tracking and management

3. **DepositManager.sol** - USDC deposit and CUT token management

   - 1:1 USDC to CUT token conversion
   - Compound V3 integration for yield generation
   - Token minting/burning on deposit/withdrawal

4. **PlatformToken.sol** - ERC20 token for the platform (CUT)
   - Standard ERC20 implementation
   - Used as payment token for contests

### Mock Contracts

- **MockUSDC.sol** - Mock USDC for testing
- **MockCompound.sol** - Mock Compound V3 for testing

## Dependencies

- **OpenZeppelin Contracts**: Security standards (ReentrancyGuard, SafeERC20, ERC1155, Ownable)
- **Base Blockchain**: Deployed on Base (mainnet) and Base Sepolia (testnet)
- **Compound V3**: For yield generation on USDC deposits

## Interfaces

### With Server

- Server reads contract state via RPC calls
- Server writes to contracts via oracle/admin functions:
  - `activateContest()` - Start contest
  - `lockContest()` - Lock secondary positions
  - `settleContest()` - Settle and distribute prizes
  - `closeContest()` - Force distribution after expiry

### With Client

- Client reads contract state via Wagmi hooks
- Client writes to contracts via wallet transactions:
  - `addPrimaryPosition()` - Join contest
  - `removePrimaryPosition()` - Leave contest
  - `addSecondaryPosition()` - Add prediction
  - `removeSecondaryPosition()` - Remove prediction
  - `claimPrimaryPayout()` - Claim winnings
  - `claimSecondaryPayout()` - Claim prediction winnings

## Key Concepts

### Three-Layer Architecture

- **Layer 0 (Oracle)**: Provides real-world event data
- **Layer 1 (Primary)**: Competition participants with fixed deposits
- **Layer 2 (Secondary)**: Prediction market on primary outcomes

### Economic Model

- **Oracle Fee**: 5% deducted from all deposits
- **Position Bonus**: 5% of secondary deposits go to entry owners
- **Cross-Subsidy**: Dynamic reallocation to maintain 30% primary target
- **Winner-Take-All**: Secondary market uses winner-take-all payout

### State Machine

Contests progress through states: OPEN → ACTIVE → LOCKED → SETTLED → CLOSED

- **OPEN**: Registration, early positions, withdrawals allowed
- **ACTIVE**: Competition running, positions locked, no withdrawals
- **LOCKED**: Competition finishing, secondary positions closed
- **SETTLED**: Results in, users claim payouts
- **CLOSED**: Force distributed, all funds moved

## Quick Links

- [Contract Architecture](architecture.md)
- [Contract Data Flow](data-flow.md)
- [Contest Contract](contracts/Contest.md)
- [ContestFactory Contract](contracts/ContestFactory.md)
- [DepositManager Contract](contracts/DepositManager.md)
- [PlatformToken Contract](contracts/PlatformToken.md)

## Reference Documentation

- [Contracts README](../../contracts/README.md) - Detailed contest lifecycle and economics
- [Contest Technical Reference](../../contracts/README_contests.md) - Technical API reference
