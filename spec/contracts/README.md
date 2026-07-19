# Contracts Layer Overview

## Purpose

The contracts layer implements the core blockchain functionality for Play The Cut:

- **Contest Management**: Smart contracts for creating and managing contests
- **Prediction Markets**: Secondary market for betting on contest outcomes
- **Referral Network**: On-chain referral graph and fee split at settlement
- **Economic Model**: Fee structures, cross-subsidies, and payout mechanisms

## Key Components

### Core Contracts

1. **ContestController** - Main contest contract (via ContestFactory)

   - Three-layer architecture (Oracle, Primary, Secondary)
   - State machine (OPEN → ACTIVE → LOCKED → SETTLED → CLOSED)
   - Primary participant deposits and prize distribution
   - Secondary prediction market
   - Cross-subsidy mechanism for pool balancing

2. **ContestFactory** - Factory for creating ContestController contracts

   - Centralized contest creation
   - Contest tracking and management

3. **ReferralGraph** - On-chain referral registration / ancestry

4. **RewardCalculator** - Stateless referral fee split math used at settlement

### Mock Contracts

- **MockUSDC.sol** - Mock payment token for Sepolia testing

## Dependencies

- **solmate / solady**: Token helpers, ownership, transfer libs
- **Base Blockchain**: Deployed on Base (mainnet) and Base Sepolia (testnet)
- **Payment token**: Canonical USDC on Base; MockUSDC on Sepolia

## Interfaces

### With Server

- Server reads contract state via RPC calls
- Server writes to contracts via oracle/admin functions (OPS_ORACLE):
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

- **OPEN**: Registration, early positions, withdrawals allowed
- **ACTIVE**: Competition running, primary locked, secondary add only
- **LOCKED**: Secondary closed; settle required here
- **SETTLED**: Results in, users claim payouts
- **CLOSED**: Force distributed, all funds moved

## Quick Links

- [Contract Architecture](architecture.md)
- [Contract Data Flow](data-flow.md)
- [Contest Contract](contracts/Contest.md)
- [ContestFactory Contract](contracts/ContestFactory.md)

## Reference Documentation

- [Contracts README](../../contracts/README.md) - Detailed contest lifecycle and economics
- [Contest Technical Reference](../../contracts/README_contests.md) - Technical API reference
