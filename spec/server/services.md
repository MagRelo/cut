# Server Services

## Overview

Services contain business logic and are used by both API routes and cron jobs. They encapsulate operations like tournament updates, contest management, and PGA Tour data integration.

## Tournament Services

### `initTournament.ts`
- **Purpose**: Initialize a new tournament
- **Operations**:
  - Fetch tournament data from PGA Tour
  - Create Tournament record
  - Fetch and create Player records
  - Create TournamentPlayer records
- **Usage**: Manual initialization of new tournaments

### `updateTournament.ts`
- **Purpose**: Update tournament data from PGA Tour
- **Operations**:
  - Scrape tournament data from PGA Tour website
  - Update Tournament record
  - Update status, rounds, leaderboard
- **Usage**: Cron job (every 5 minutes)

### `updateTournamentPlayers.ts`
- **Purpose**: Update player scores and leaderboard positions
- **Operations**:
  - Scrape player scorecards from PGA Tour
  - Calculate Stableford scores
  - Update TournamentPlayer records
  - Update leaderboard positions
- **Usage**: Cron job (every 5 minutes, when tournament active)

### `updateContestLineups.ts`
- **Purpose**: Update contest lineup scores and create timeline snapshots
- **Operations**:
  - Calculate lineup scores from player scores
  - Update ContestLineup records
  - Create ContestLineupTimeline snapshots
  - Update leaderboard positions
- **Usage**: Cron job (every 5 minutes, after player updates)

## Contest Services

### Contest Lifecycle Services (`services/contest/`)

#### `activateContest.ts`
- **Purpose**: Activate a contest (OPEN → ACTIVE)
- **Operations**:
  - Verify contest is in OPEN state
  - Call contract `activateContest()` function
  - Update database status
- **Usage**: Cron job (batch operation)

#### `lockContest.ts`
- **Purpose**: Lock a contest (ACTIVE → LOCKED)
- **Operations**:
  - Verify contest is in ACTIVE state
  - Call contract `lockContest()` function
  - Update database status
- **Usage**: Cron job (batch operation)

#### `settleContest.ts`
- **Purpose**: Settle a contest (ACTIVE/LOCKED → SETTLED)
- **Operations**:
  - Calculate winners based on scores
  - Calculate payout distribution
  - Call contract `settleContest()` function
  - Update database status and results
- **Usage**: Cron job (batch operation)

#### `closeContest.ts`
- **Purpose**: Close a contest (SETTLED → CLOSED)
- **Operations**:
  - Verify contest is SETTLED and past expiry
  - Call contract `closeContest()` function
  - Update database status
- **Usage**: Cron job (batch operation)

#### `cancelContest.ts`
- **Purpose**: Cancel a contest
- **Operations**:
  - Verify contest can be cancelled
  - Call contract `cancelContest()` function
  - Update database status
- **Usage**: Manual/admin operation

### Batch Services (`services/batch/`)

#### `batchActivateContests.ts`
- **Purpose**: Activate multiple contests
- **Operations**:
  - Find contests that should be activated
  - Call `activateContest()` for each
  - Return batch results
- **Usage**: Cron job

#### `batchLockContests.ts`
- **Purpose**: Lock multiple contests
- **Operations**:
  - Find contests that should be locked
  - Call `lockContest()` for each
  - Return batch results
- **Usage**: Cron job

#### `batchSettleContests.ts`
- **Purpose**: Settle multiple contests
- **Operations**:
  - Find contests that should be settled
  - Call `settleContest()` for each
  - Return batch results
- **Usage**: Cron job

#### `batchCloseContests.ts`
- **Purpose**: Close multiple contests
- **Operations**:
  - Find contests that should be closed
  - Call `closeContest()` for each
  - Return batch results
- **Usage**: Cron job

## Utility Services

### `mintUserTokens.ts`
- **Purpose**: Mint test tokens to new users
- **Operations**:
  - Mint USDC to user wallet (testnet only)
  - Used during user registration
- **Usage**: Auth service (on new user creation)

## Service Patterns

### Error Handling
- Services throw errors that are caught by routes/cron
- Errors are logged with context
- Database errors are handled gracefully

### Transaction Management
- Prisma transactions used for multi-step operations
- Rollback on errors
- Atomic updates

### External API Integration
- PGA Tour scraping via cheerio
- Blockchain RPC calls via viem
- Retry logic for transient failures

### Data Transformation
- Raw PGA Tour data → normalized database records
- Database records → API response format
- Score calculations (Stableford system)

## Service Dependencies

### Database
- All services use Prisma for database access
- Type-safe queries
- Transaction support

### External Services
- **PGA Tour**: Web scraping for tournament data
- **Base Blockchain**: RPC calls for contract interactions
- **Porto**: Wallet signature verification

## Testing Considerations

- Services should be testable in isolation
- Mock external dependencies
- Test error cases
- Test transaction rollbacks

