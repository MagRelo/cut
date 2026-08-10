# ContestFactory Contract

## Purpose

Factory for `ContestController` instances. Trust-critical parameters are factory immutables so permissionless `createContest` callers cannot choose the payment asset, operator, or referral stack.

## Responsibilities

- Hold immutable `paymentToken`, `operator`, `referralGraph`, `rewardCalculator`, `referralGroupId`
- Deploy new ContestController instances with those immutables
- Track created contests and contest hosts
- Emit `ContestCreated`

## Key State Variables

### Immutables (set at factory deploy)

- `paymentToken`
- `operator` — trusted escrow/ops agent for lifecycle, settle, push
- `referralGraph`
- `rewardCalculator`
- `referralGroupId`

### Public State

- `contests[]`: all created contest addresses
- `contestHost`: contest address → creator

## Constructor

```solidity
constructor(
  address _paymentToken,
  address _operator,
  address _referralGraph,
  address _rewardCalculator,
  bytes32 _referralGroupId
)
```

## Key Functions

### `createContest(...)`

- **Purpose**: Deploy a new ContestController
- **Parameters**:
  - `contestantDepositAmount`: primary deposit amount
  - `referralNetworkBps`: referral fee at settlement (≤ 1000)
  - `expiry`: expiration timestamp (unix seconds)
  - `primaryDepositSecondarySubsidyBps`: BPS of each primary deposit credited to secondary subsidy
- **Returns**: address of the new ContestController
- **Effects**: deploys controller with factory immutables, appends to `contests[]`, sets host, emits `ContestCreated`

## Events

### `ContestCreated`

Parameters include contest address, host, deposit amount, and the factory immutables (`paymentToken`, `operator`, referral stack).

## Usage Pattern

1. Deploy factory with payment token, operator (OPS), and referral stack addresses
2. Anyone calls `createContest` with the four uint parameters
3. Interact with the returned ContestController; operator is fixed by the factory
