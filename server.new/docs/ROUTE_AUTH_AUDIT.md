# Route Authentication Audit - server.new

## Overview

This audit examines all routes in the `server.new` directory to identify their authentication status and potential security vulnerabilities.

## Authentication Middleware

- **File**: `src/middleware/auth.ts`
- **Implementation**: JWT-based authentication using `requireAuth` middleware
- **Token Sources**:
  - Authorization header (`Bearer <token>`)
  - HTTP-only cookie (`auth`)
- **Token Validation**: Uses `JWT_SECRET` environment variable (falls back to "temporary-secret-key")

## Route Analysis

### 1. Auth Routes (`/auth`)

**File**: `src/routes/auth.ts`

| Endpoint            | Method | Auth Required | Description           | Security Status           |
| ------------------- | ------ | ------------- | --------------------- | ------------------------- |
| `/auth/siwe/nonce`  | GET    | ❌ No         | Generate SIWE nonce   | ✅ Safe (public)          |
| `/auth/siwe`        | POST   | ❌ No         | SIWE authentication   | ✅ Safe (auth endpoint)   |
| `/auth/siwe/logout` | POST   | ❌ No         | SIWE logout           | ✅ Safe (logout endpoint) |
| `/auth/me`          | GET    | ✅ Yes        | Get current user info | ✅ Secure                 |
| `/auth/update`      | PUT    | ✅ Yes        | Update user profile   | ✅ Secure                 |
| `/auth/settings`    | PUT    | ✅ Yes        | Update user settings  | ✅ Secure                 |

### 2. Tournament Routes (`/tournaments`)

**File**: `src/routes/tournament.ts`

| Endpoint              | Method | Auth Required | Description                | Security Status   |
| --------------------- | ------ | ------------- | -------------------------- | ----------------- |
| `/tournaments/active` | GET    | ❌ No         | Get active tournament data | ⚠️ **VULNERABLE** |

**Security Issue**: This endpoint exposes tournament and player data without authentication. While this might be intentional for public tournament data, it could expose sensitive information.

### 3. User Routes (`/users`)

**File**: `src/routes/user.ts`

| Endpoint                  | Method | Auth Required | Description             | Security Status |
| ------------------------- | ------ | ------------- | ----------------------- | --------------- |
| `/users/groups`           | GET    | ✅ Yes        | Get all user groups     | ✅ Secure       |
| `/users/groups/:id`       | GET    | ✅ Yes        | Get specific user group | ✅ Secure       |
| `/users/groups/:id/join`  | POST   | ✅ Yes        | Join user group         | ✅ Secure       |
| `/users/groups/:id/leave` | DELETE | ✅ Yes        | Leave user group        | ✅ Secure       |
| `/users/groups/:id`       | DELETE | ✅ Yes        | Delete user group       | ✅ Secure       |

**Status**: ✅ **SECURED** - All user group routes now require authentication

### 4. Lineup Routes (`/lineup`)

**File**: `src/routes/lineup.ts`

| Endpoint                   | Method | Auth Required | Description                    | Security Status |
| -------------------------- | ------ | ------------- | ------------------------------ | --------------- |
| `/lineup/:tournamentId`    | POST   | ✅ Yes        | Create new lineup              | ✅ Secure       |
| `/lineup/:lineupId`        | PUT    | ✅ Yes        | Update lineup                  | ✅ Secure       |
| `/lineup/lineup/:lineupId` | GET    | ✅ Yes        | Get specific lineup            | ✅ Secure       |
| `/lineup/:tournamentId`    | GET    | ✅ Yes        | Get all lineups for tournament | ✅ Secure       |

### 5. Contest Routes (`/contests`)

**File**: `src/routes/contest.ts`

| Endpoint                          | Method | Auth Required | Description                | Security Status |
| --------------------------------- | ------ | ------------- | -------------------------- | --------------- |
| `/contests`                       | GET    | ✅ Yes        | Get contests by tournament | ✅ Secure       |
| `/contests/:id`                   | GET    | ✅ Yes        | Get specific contest       | ✅ Secure       |
| `/contests`                       | POST   | ✅ Yes        | Create new contest         | ✅ Secure       |
| `/contests/:id/lineups`           | POST   | ✅ Yes        | Add lineup to contest      | ✅ Secure       |
| `/contests/:id/lineups/:lineupId` | DELETE | ✅ Yes        | Remove lineup from contest | ✅ Secure       |

**Status**: ✅ **SECURED** - All contest routes now require authentication

### 6. Porto Routes (`/porto`)

**File**: `src/routes/porto.ts`

| Endpoint     | Method | Auth Required | Description        | Security Status   |
| ------------ | ------ | ------------- | ------------------ | ----------------- |
| `/porto/rpc` | ALL    | ❌ No         | Porto RPC endpoint | ⚠️ **VULNERABLE** |

**Security Issues**:

- Porto RPC endpoint lacks authentication
- Handles merchant operations without user verification
- Could be exploited for unauthorized transactions

## Summary

### Secure Routes (✅)

- All auth routes (except public auth endpoints)
- All lineup routes
- Contest lineup management routes

### Vulnerable Routes (⚠️)

1. **Tournament routes**: Expose tournament data publicly
2. **Porto routes**: Allow unauthenticated RPC operations

### Critical Security Issues

1. **Porto RPC Endpoint**: No authentication for merchant operations
2. **Tournament Data Exposure**: Public access to tournament and player data

## Recommendations

### Immediate Actions Required

1. **Add Authentication to Porto Routes**:

   ```typescript
   // Add requireAuth middleware to Porto RPC endpoint
   router.all("/rpc", requireAuth, createPortoMiddleware(portoHandler));
   ```

2. **Consider Tournament Data Access**:
   - If tournament data should be public, document this decision
   - If not, add authentication to tournament routes

### Additional Security Improvements

1. **Add Authorization Checks**: Ensure users can only access/modify their own data
2. **Rate Limiting**: Add rate limiting to prevent abuse
3. **Input Validation**: Add comprehensive input validation
4. **Audit Logging**: Log all sensitive operations
5. **Environment Variables**: Ensure `JWT_SECRET` is properly set in production

## Files Modified

- `src/routes/contest.ts` - ✅ **COMPLETED** - Added authentication to all contest routes
- `src/routes/user.ts` - ✅ **COMPLETED** - Added authentication to all user group routes
- `src/routes/porto.ts` - Add authentication to Porto RPC endpoint
- `src/routes/tournament.ts` - Consider adding authentication (if needed)
