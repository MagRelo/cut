# Server Layer Overview

## Purpose

The server layer provides the backend API and services for Bet the Cut:
- **REST API**: HTTP endpoints for client communication
- **Database Management**: PostgreSQL database with Prisma ORM
- **PGA Tour Integration**: Scraping and syncing PGA Tour data
- **Contest Management**: Server-side contest operations and state management
- **Automated Updates**: Cron jobs for tournament and contest updates
- **Authentication**: Privy access tokens (Bearer) verified on protected routes; users and wallets provisioned from Privy identities

## Key Components

### API Routes (`server/src/routes/`)
- **api.ts**: Main API router, mounts all route modules
- **auth.ts**: Authenticated user routes (`/me`, profile updates, contest history)
- **tournament.ts**: Tournament data endpoints
- **lineup.ts**: Tournament lineup CRUD operations
- **contest.ts**: Contest management and operations
- **userGroup.ts**: User group management
- **cron.ts**: Cron job triggers (admin)
### Services (`server/src/services/`)
- **initTournament.ts**: Initialize new tournament
- **updateTournament.ts**: Update tournament data from PGA Tour
- **updateTournamentPlayers.ts**: Update player scores and leaderboard
- **updateContestLineups.ts**: Update contest lineup scores and timeline
- **contest/**: Contest lifecycle operations
  - `activateContest.ts`: Activate contest
  - `lockContest.ts`: Lock contest
  - `settleContest.ts`: Settle contest
  - `closeContest.ts`: Close contest
  - `cancelContest.ts`: Cancel contest
- **batch/**: Batch operations for multiple contests
  - `batchActivateContests.ts`
  - `batchLockContests.ts`
  - `batchSettleContests.ts`
  - `batchCloseContests.ts`
- **mintUserTokens.ts**: Mint test tokens for new users

### Database (`server/prisma/`)
- **schema.prisma**: Database schema definition
- **seed.ts**: Database seeding
- **seedPGA.ts**: PGA Tour data seeding

### Cron Jobs (`server/src/cron/`)
- **scheduler.ts**: Main cron scheduler
- Runs every 5 minutes: Tournament → Activate → Lock → Players → Lineups → Settle → Close

### Middleware (`server/src/middleware/`)
- **auth.ts**: `requireAuth` — verifies `Authorization: Bearer` with Privy and sets user context
- **errorHandler.ts**: Error handling middleware
- **tournamentStatus.ts**: Tournament status checks
- **userGroup.ts**: User group membership checks

### Libraries (`server/src/lib/`)
- **prisma.ts**: Prisma client instance
- **privyClient.ts**: Privy server client for access token verification
- **privyUserProvisioning.ts**: Maps Privy users to Cut `User` / `UserWallet` rows
- **pga*.ts**: PGA Tour data scraping utilities
- **chainConfig.ts**: Blockchain configuration
- **email.ts**: Email utilities
- **sms.ts**: SMS utilities

## Dependencies

### External Services
- **PostgreSQL**: Database
- **PGA Tour**: Data source (web scraping)
- **Base Blockchain**: Contract interactions via RPC
- **Privy**: Access token verification for API authentication

### Key Libraries
- **Hono**: Web framework (lightweight Express alternative)
- **Prisma**: ORM for database access
- **viem**: Ethereum library for contract interactions
- **node-cron**: Cron job scheduling
- **cheerio**: HTML parsing for web scraping

## Interfaces

### With Client
- **REST API**: JSON over HTTP
- **Authentication**: `Authorization: Bearer` (Privy access token); optional `X-Cut-Chain-Id`
- **CORS**: Configured for allowed origins
- **Static Files**: Serves client build files

### With Contracts
- **RPC Calls**: Reads contract state
- **Transaction Signing**: Oracle/admin operations via private key
- **Event Listening**: Monitors contract events (if implemented)

### With Database
- **Prisma ORM**: Type-safe database access
- **Migrations**: Schema versioning
- **Seeding**: Initial data population

## Key Concepts

### Authentication Flow
1. Client obtains a Privy access token after login
2. Client sends the token on each protected request
3. Middleware verifies the token with Privy and attaches the Cut user (provisioning `User` / `UserWallet` as needed)
4. Route handlers read user id, wallet address, and chain from context

### Contest Lifecycle Management
- Server monitors contest states
- Cron jobs automatically transition contests
- Server calls contract functions as oracle
- Server syncs contract state to database

### PGA Tour Data Sync
- Web scraping for tournament data
- Player scores updated every 10 minutes during active tournaments
- Leaderboard positions calculated
- Stableford scoring system

## Quick Links

- [Server Architecture](architecture.md)
- [API Documentation](api.md)
- [Data Models](data-models.md)
- [Services](services.md)
- [Cron Jobs](cron.md)

