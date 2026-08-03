# ContestFactory Contract

## Purpose

The ContestFactory contract provides a centralized way to create and manage Contest contracts. It implements the factory pattern to standardize contest creation and enable tracking of all created contests.

## Responsibilities

- Create new ContestController instances
- Track all created contests
- Emit events for contest creation
- Store contest host information

## Key State Variables

### Public State
- `contests[]`: Array of all created contest addresses
- `contestHost`: Mapping of contest address to creator address

## Key Functions

### `createContest(...)`
- **Purpose**: Create a new ContestController contract
- **Parameters**:
  - `paymentToken`: ERC20 token address (USDC on Base, MockUSDC on Sepolia)
  - `oracle`: Hot oracle address for lifecycle control (activate, lock, settle, push)
  - `contestantDepositAmount`: Required primary deposit
  - `referralNetworkBps`: Referral network fee in basis points (e.g. 500 = 5%)
  - `expiry`: Expiration timestamp
  - `primaryDepositSecondarySubsidyBps`: Share of primary deposit routed to secondary subsidy
  - `referralGraph`: ReferralGraph contract address
  - `rewardCalculator`: RewardCalculator contract address
  - `referralGroupId`: `bytes32` group id on ReferralGraph
  - `emergencyRecovery`: Cold address-only recovery role (must differ from `oracle`); referral tree root and post-expiry residual recovery
- **Returns**: Address of newly created ContestController
- **Effects**:
  - Validates parameters
  - Deploys new ContestController
  - Adds to `contests[]`
  - Sets `contestHost[contest] = msg.sender`
  - Emits `ContestCreated` event

## Dependencies

- **ContestController**: Creates instances of this contract
- **Payment token**: ERC20 used for deposits and payouts
- **ReferralGraph** / **RewardCalculator**: Referral network at settlement

## Events

### `ContestCreated`
- Emitted when a new contest is created
- Parameters:
  - `contest`: Address of new contest
  - `host`: Address of creator
  - `contestantDepositAmount`: Deposit amount required

## Usage Pattern

1. User calls `createContest()` with desired parameters
2. Factory validates and creates ContestController
3. Factory tracks the new contest
4. User can now interact with the Contest directly

## Design Decisions

### Why Factory Pattern?
- Centralized creation ensures consistent initialization
- Enables tracking of all contests
- Simplifies discovery and management
- Allows future upgrades to creation logic
