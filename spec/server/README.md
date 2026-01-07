# Server Layer Overview

## Purpose

The server layer provides the backend API and services for Bet the Cut:
- **REST API**: HTTP endpoints for client communication
- **Database Management**: PostgreSQL database with Prisma ORM
- **PGA Tour Integration**: Scraping and syncing PGA Tour data
- **Contest Management**: Server-side contest operations and state management
- **Automated Updates**: Cron jobs for tournament and contest updates
- **Authentication**: SIWE (Sign-In With Ethereum) authentication

## Key Components

### API Routes (`server/src/routes/`)
- **api.ts**: Main API router, mounts all route modules
- **auth.ts**: Authentication (SIWE), user management
- **tournament.ts**: Tournament data endpoints
- **lineup.ts**: Tournament lineup CRUD operations
- **contest.ts**: Contest management and operations
- **userGroup.ts**: User group management
- **cron.ts**: Cron job triggers (admin)
- **porto.ts**: Porto wallet integration

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
- **auth.ts**: Authentication middleware (JWT)
- **errorHandler.ts**: Error handling middleware
- **tournamentStatus.ts**: Tournament status checks
- **userGroup.ts**: User group membership checks

### Libraries (`server/src/lib/`)
- **prisma.ts**: Prisma client instance
- **pga*.ts**: PGA Tour data scraping utilities
- **chainConfig.ts**: Blockchain configuration
- **email.ts**: Email utilities
- **sms.ts**: SMS utilities

## Dependencies

### External Services
- **PostgreSQL**: Database
- **PGA Tour**: Data source (web scraping)
- **Base Blockchain**: Contract interactions via RPC
- **Porto**: Wallet infrastructure

### Key Libraries
- **Hono**: Web framework (lightweight Express alternative)
- **Prisma**: ORM for database access
- **viem**: Ethereum library for contract interactions
- **node-cron**: Cron job scheduling
- **cheerio**: HTML parsing for web scraping

## Interfaces

### With Client
- **REST API**: JSON over HTTP
- **Authentication**: SIWE with JWT cookies
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
1. Client requests SIWE nonce
2. Client signs message with wallet
3. Server verifies signature via Porto
4. Server creates/updates user and wallet
5. Server issues JWT cookie
6. Subsequent requests include JWT cookie

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

