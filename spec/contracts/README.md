# Contracts Layer Overview

## Purpose

The contracts layer implements the core blockchain functionality for Play The Cut:

- **Contest Management**: Smart contracts for creating and managing contests
- **Prediction Markets**: Secondary market for betting on contest outcomes
- **Economic Model**: Referral-network fees, cross-subsidies, and payout mechanisms
- **Referral Graph**: On-chain invite tree and reward distribution

## Key Components

### Core Contracts

1. **ContestController** — Main contest contract (instances via factory)

   - Three-layer architecture (Oracle, Primary, Secondary)
   - State machine (OPEN → ACTIVE → LOCKED → SETTLED → CLOSED)
   - Primary participant deposits and prize distribution
   - Secondary prediction market
   - Cross-subsidy mechanism for pool balancing

2. **ContestFactory** — Factory for creating ContestController contracts

   - Centralized contest creation
   - Contest tracking and management

3. **ReferralGraph** / **RewardDistributor** — On-chain referral tree and fee splits

### Mock Contracts

- **MockUSDC** — Mintable 6-decimal payment token for Base Sepolia only

### Payment token

- **Base mainnet:** canonical USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- **Base Sepolia:** MockUSDC (`xUSDC`)

## Dependencies

- **contestCatalyst** / **referralTree** git submodules
- **Base Blockchain**: Base (mainnet) and Base Sepolia (testnet)

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

### State Machine

Contests progress through states: OPEN → ACTIVE → LOCKED → SETTLED → CLOSED

## Quick Links

- [Contract Architecture](architecture.md)
- [Contract Data Flow](data-flow.md)
- [Contest Contract](contracts/Contest.md)
- [ContestFactory Contract](contracts/ContestFactory.md)

## Reference Documentation

- [Contracts README](../../contracts/README.md) - Detailed contest lifecycle and economics
- [Contest Technical Reference](../../contracts/README_contests.md) - Technical API reference
- [Referral network](../../docs/platform/referral-network.md)
