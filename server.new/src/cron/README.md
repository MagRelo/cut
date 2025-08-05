# Cron System

This directory contains the cron job scheduler for the Cut application.

## Overview

The cron system automatically runs various tasks at scheduled intervals to keep the application data up to date and handle contest lifecycle events. It uses the existing Prisma client from `../lib/prisma.js` to ensure consistent database connections across the application.

## Configuration

### Environment Variables

- `ENABLE_CRON`: Set to `'true'` to enable the cron scheduler, `'false'` or unset to disable it

### Example Usage

```bash
# Enable cron jobs
ENABLE_CRON=true npm run dev

# Disable cron jobs
ENABLE_CRON=false npm run dev
```

## Scheduled Jobs

### Every 5 Minutes

1. **Update Tournament** (`updateTournament.ts`)

   - Updates tournament metadata from PGA API
   - Updates tournament status, rounds, weather info

2. **Close Escrow Deposits** (`closeEscrowDeposits.ts`)

   - Closes escrow deposits for contests where tournament is IN_PROGRESS but contest is OPEN
   - Updates contest status to CLOSED

3. **Distribute Contests** (`distributeContest.ts`)
   - Distributes payouts for contests where tournament is COMPLETED but contest is IN_PROGRESS
   - Calculates payouts based on lineup positions
   - Updates contest status to SETTLED

### Every 5 Minutes (Conditional)

These jobs only run when `tournament.roundStatusDisplay` is 'In Progress' or 'Complete':

4. **Update Tournament Players** (`updateTournamentPlayers.ts`)

   - Updates player scores from PGA API
   - Processes players in batches to avoid overwhelming the API

5. **Update Contest Lineups** (`updateContestLineups.ts`)
   - Updates contest lineup totals and positions
   - Recalculates scores based on updated player data

## Manual Jobs

- **Initialize Tournament** (`initTournament.ts`)
  - Run manually when starting a new tournament
  - Updates tournament metadata and player records

## API Endpoints

- `GET /api/cron/status` - Check cron system status

## Logging

All cron jobs log their execution with the `[CRON]` prefix:

```
[CRON] Starting job: Update Tournament
[CRON] Completed job: Update Tournament
[CRON] Error in job Update Tournament: Error message
```

## Error Handling

- All jobs have error handling to prevent one failed job from affecting others
- Failed jobs are logged but don't stop the scheduler
- The scheduler continues running even if individual jobs fail

## Graceful Shutdown

The cron scheduler properly stops all jobs when the server receives SIGTERM or SIGINT signals.

## Development

To test cron jobs manually, you can run them using the npm scripts:

```bash
npm run service:update-tournament
npm run service:update-players
npm run service:update-contest-lineups
npm run service:close-contest
npm run service:distribute-contest
```
