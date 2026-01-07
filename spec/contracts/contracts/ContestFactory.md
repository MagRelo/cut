# ContestFactory Contract

## Purpose

The ContestFactory contract provides a centralized way to create and manage Contest contracts. It implements the factory pattern to standardize contest creation and enable tracking of all created contests.

## Responsibilities

- Create new Contest contract instances
- Track all created contests
- Calculate default liquidity parameters
- Emit events for contest creation
- Store contest host information

## Key State Variables

### Public State
- `contests[]`: Array of all created contest addresses
- `contestHost`: Mapping of contest address to creator address

### Constants
- `LIQUIDITY_MULTIPLIER`: Multiplier for calculating liquidity parameter (100)

## Key Functions

### `createContest(...)`
- **Purpose**: Create a new Contest contract
- **Parameters**:
  - `paymentToken`: ERC20 token address (typically PlatformToken)
  - `oracle`: Oracle address for state control
  - `contestantDepositAmount`: Required deposit for contestants
  - `oracleFee`: Oracle fee in basis points (max 1000 = 10%)
  - `expiry`: Expiration timestamp
  - `liquidityParameterOverride`: Custom LMSR parameter (0 = auto-calculate)
  - `demandSensitivity`: LMSR demand sensitivity in basis points
  - `positionBonusShareBps`: Position bonus share (basis points)
  - `targetPrimaryShareBps`: Target primary share (basis points)
  - `maxCrossSubsidyBps`: Maximum cross-subsidy (basis points)
- **Returns**: Address of newly created Contest contract
- **Effects**:
  - Validates parameters
  - Calculates liquidity parameter if override is 0
  - Deploys new Contest contract
  - Adds to `contests[]`
  - Sets `contestHost[contest] = msg.sender`
  - Emits `ContestCreated` event

## Liquidity Parameter Calculation

If `liquidityParameterOverride` is 0, the factory calculates:
```
liquidityParameter = contestantDepositAmount × LIQUIDITY_MULTIPLIER
```

This creates:
- **Steeper curves** for small contests (higher prices, less volume expected)
- **Flatter curves** for large contests (lower prices, more volume expected)

## Dependencies

- **Contest.sol**: Creates instances of this contract
- **PlatformToken**: Typically used as payment token

## Events

### `ContestCreated`
- Emitted when a new contest is created
- Parameters:
  - `contest`: Address of new contest
  - `host`: Address of creator
  - `contestantDepositAmount`: Deposit amount required

## Usage Pattern

1. User calls `createContest()` with desired parameters
2. Factory validates and creates Contest contract
3. Factory tracks the new contest
4. User can now interact with the Contest directly

## Design Decisions

### Why Factory Pattern?
- Centralized creation ensures consistent initialization
- Enables tracking of all contests
- Simplifies discovery and management
- Allows future upgrades to creation logic

### Why Auto-Calculate Liquidity?
- Reduces configuration complexity
- Adapts to contest size automatically
- Provides sensible defaults
- Still allows override for custom needs

