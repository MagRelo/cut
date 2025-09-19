# API Routing Documentation

This document provides a comprehensive overview of all API routes and static file serving in the Bet the Cut application.

## Base Configuration

- **Server Framework**: Express.js 5.1
- **Base API Path**: `/api`
- **Port**: 3000 (configurable via `PORT` environment variable)
- **CORS**: Configured for localhost:5173 and localhost:3000 (configurable via `ALLOWED_ORIGINS`)

## Static File Serving

### Static Assets

- **Path**: `/dist/public/dist`
- **Cache Settings**:
  - Max Age: 1 hour
  - ETag: Enabled
  - Last-Modified: Enabled

### Client-Side Routing Support

- **Catch-all Route**: Serves `index.html` for all non-API, non-static file requests
- **Cache Headers**: No-cache headers for HTML files to ensure fresh content
- **Exclusions**: Routes starting with `/api` or containing file extensions are excluded

## API Routes

### Authentication Routes (`/api/auth`)

#### SIWE Authentication

- **POST** `/api/auth/siwe/nonce` - Generate SIWE nonce
- **POST** `/api/auth/siwe/verify` - Verify SIWE signature and authenticate user
- **POST** `/api/auth/siwe/logout` - Logout user

#### User Management

- **GET** `/api/auth/me` - Get current user information (requires auth)
- **PUT** `/api/auth/update` - Update user profile (requires auth)
- **PUT** `/api/auth/settings` - Update user settings (requires auth)

### Tournament Routes (`/api/tournaments`)

- **GET** `/api/tournaments/active` - Get active tournament with players and tournament data

### Lineup Routes (`/api/lineup`)

- **POST** `/api/lineup/:tournamentId` - Create new lineup for tournament (requires auth)
- **PUT** `/api/lineup/:lineupId` - Update existing lineup (requires auth)
- **GET** `/api/lineup/lineup/:lineupId` - Get specific lineup by ID (requires auth)
- **GET** `/api/lineup/:tournamentId` - Get all lineups for tournament (requires auth)

### Contest Routes (`/api/contests`)

- **GET** `/api/contests` - Get contests by tournament ID (requires auth)
- **GET** `/api/contests/:id` - Get contest by ID (requires auth)
- **POST** `/api/contests` - Create new contest (requires auth)
- **POST** `/api/contests/:id/lineups` - Add lineup to contest (requires auth)
- **DELETE** `/api/contests/:id/lineups/:lineupId` - Remove lineup from contest (requires auth)

### Cron Routes (`/api/cron`)

- **GET** `/api/cron/status` - Get cron job status

### Porto Integration (`/porto`)

- **POST** `/porto/merchant` - Porto merchant route for sponsored transactions
  - Handles transaction sponsorship based on contract addresses
  - Integrates with contest addresses and merchant contracts
  - Uses environment variables for merchant configuration

## Middleware Stack

1. **CORS** - Cross-origin resource sharing configuration
2. **Request Logger** - Logs incoming requests
3. **Body Parsing**:
   - JSON parsing
   - URL-encoded parsing (for Porto compatibility)
   - Plain text parsing (for Porto compatibility)
4. **Cookie Parser** - Handles authentication cookies
5. **Static File Serving** - Serves client assets
6. **API Routes** - Main API endpoint handling
7. **Client-Side Routing** - Catch-all for SPA routing
8. **Error Handling** - Global error and 404 handlers

## Authentication

- **Method**: JWT-based authentication with SIWE (Sign-In with Ethereum)
- **Cookie**: HTTP-only, secure in production, strict same-site
- **Expiration**: 7 days
- **Middleware**: `requireAuth` middleware for protected routes

## Environment Variables

### Required

- `DATABASE_URL` - Prisma database connection
- `ORACLE_ADDRESS` - Oracle wallet address
- `ORACLE_PRIVATE_KEY` - Oracle private key
- `RPC_URL` - Blockchain RPC endpoint
- `BASESCAN_API_KEY` - BaseScan API key
- `MERCHANT_ADDRESS` - Porto merchant address
- `MERCHANT_PRIVATE_KEY` - Porto merchant private key

### Optional

- `ENABLE_CRON` - Enable/disable cron scheduler
- `ENABLE_TOKEN_MINTING` - Enable/disable token minting for new users
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - JWT signing secret

## Error Handling

- **404 Handler**: Returns JSON error for unmatched routes
- **Global Error Handler**: Catches and formats all unhandled errors
- **Graceful Shutdown**: Handles SIGTERM and SIGINT signals

## Cron Integration

- **Scheduler**: Automatic cron job management
- **Status Endpoint**: Available at `/api/cron/status`
- **Configuration**: Controlled via `ENABLE_CRON` environment variable
