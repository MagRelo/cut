# Server API Documentation

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

Protected endpoints expect:

- **Header**: `Authorization: Bearer <privy_access_token>`
- **Optional**: `X-Cut-Chain-Id` — preferred chain when resolving the user’s wallet for that request

The server verifies the token with Privy, attaches the Cut user to the request context, and provisions `User` / `UserWallet` records from the Privy user when needed.

Unauthenticated routes are explicitly noted below (e.g. health, some tournament reads).

## API Routes

### Health Check

#### `GET /api/health`
- **Description**: API health check
- **Auth**: None
- **Response**: `{ status: "healthy", service: "API", timestamp: string }`

### Authentication (`/api/auth`)

#### `GET /api/auth/me`
- **Description**: Get current user information
- **Auth**: Required
- **Response**: User object with tournament lineups and user groups

#### `PUT /api/auth/update`
- **Description**: Update user name
- **Auth**: Required
- **Body**: `{ name: string }`
- **Response**: `{ success: boolean, user: User }`

#### `PUT /api/auth/settings`
- **Description**: Update user settings
- **Auth**: Required
- **Body**: `{ settings: object }`
- **Response**: `{ success: boolean, settings: object }`

#### `GET /api/auth/contests`
- **Description**: Get user's contest history
- **Auth**: Required
- **Response**: `{ contests: Contest[] }`

### Tournaments (`/api/tournaments`)

#### `GET /api/tournaments/active/shell`
- **Description**: Week/setup fields for the active tournament (init-tournament; no live status or players)
- **Auth**: None
- **Response**: `{ tournament: TournamentShell }` — `id`, `pgaTourId`, `name`, `startDate`, `endDate`, `beautyImage`, `summarySections`, `timezone`, `manualActive`, timestamps
- **Cache**: 24 hours (HTTP); client `staleTime` 24h, no poll

#### `GET /api/tournaments/active/live`
- **Description**: Cron-updated round status and in-field player scores for the active tournament (single payload)
- **Auth**: None
- **Response**: `{ tournament: TournamentLive, players: PlayerWithTournamentData[] }`
- **Cache**: ~2 minutes (HTTP); client refetches every 5 minutes (aligned with cron pipeline)

The monolithic `GET /api/tournaments/active` and the split `active/metadata` + `active/players` endpoints have been **removed**. Clients merge shell + live via `mergeTournament()` and `useActiveTournament()`.

### Lineups (`/api/lineup`)

#### `POST /api/lineup/:tournamentId`
- **Description**: Create new tournament lineup
- **Auth**: Required
- **Body**: `{ players: string[], name?: string }`
- **Response**: `{ lineups: TournamentLineup[] }`

#### `PUT /api/lineup/:lineupId`
- **Description**: Update existing lineup
- **Auth**: Required
- **Body**: `{ players: string[], name?: string }`
- **Response**: `{ lineups: TournamentLineup[] }`

#### `GET /api/lineup/lineup/:lineupId`
- **Description**: Get specific lineup by ID
- **Auth**: Required
- **Response**: `{ lineups: TournamentLineup[] }`

#### `GET /api/lineup/:tournamentId`
- **Description**: Get all lineups for tournament
- **Auth**: Required
- **Response**: `{ lineups: TournamentLineup[] }`

### Contests (`/api/contests`)

#### `GET /api/contests`
- **Description**: List contests for a tournament. Returns public contests for all callers; when authenticated, also includes league contests for groups the caller belongs to.
- **Auth**: Optional (`Authorization` merges league contests for members)
- **Query Params**:
  - `tournamentId`: string (required)
  - `chainId`: number (optional — omit to return Base + Base Sepolia)
  - `userGroupId`: string (optional — scope to one league; caller must be a member)
- **Response**: `Contest[]` (includes `userGroup: { id, name }` when scoped to a league)

#### `GET /api/contests/:id`
- **Description**: Get contest by database id or contract address. League contests return **404** for non-members.
- **Auth**: Optional (required implicitly for league contests)
- **Response**: `Contest`

#### `GET /api/contests/:id/timeline`
- **Description**: Timeline chart data for a contest. League contests return **404** for non-members.
- **Auth**: Optional (required implicitly for league contests)

#### `POST /api/contests`
- **Description**: Create new contest
- **Auth**: Required
- **Authorization**: App staff (`ADMIN` / `SUPER_ADMIN`) for public contests; league `ADMIN` when `userGroupId` is set
- **Body**: `{ name: string, description?: string, tournamentId: string, userGroupId?: string, endDate: string|number, address: string, chainId: number, settings?: object }`
- **Response**: `Contest` (201)

#### `POST /api/contests/:id/lineups`
- **Description**: Add lineup to contest. League contests return **404** for non-members.
- **Auth**: Required
- **Body**: `{ tournamentLineupId: string, entryId: string }`
- **Response**: `Contest` (201)

#### `DELETE /api/contests/:id/lineups/:lineupId`
- **Description**: Remove lineup from contest
- **Auth**: Required
- **Response**: `Contest`

### User Groups / Leagues (`/api/userGroups`)

Product term: **League**. All routes require authentication unless noted.

#### `GET /api/userGroups`
- **Description**: List leagues the caller belongs to (membership-scoped; no public directory)
- **Auth**: Required
- **Response**: `{ userGroups: UserGroupListItem[] }`

#### `POST /api/userGroups/join`
- **Description**: Self-join a league via invite code
- **Auth**: Required
- **Body**: `{ inviteCode: string }`
- **Response**: `UserGroupDetail` (201)
- **Errors**: `404` invalid code; `409` already a member (includes `userGroupId` in body)

#### `GET /api/userGroups/:id`
- **Description**: League detail with members
- **Auth**: Required; **members only** (non-members receive `404`)
- **Response**: `UserGroupDetail` — admins also receive `inviteCode` and `inviteUrl` when a code exists

#### `POST /api/userGroups`
- **Description**: Create league; creator becomes `ADMIN`
- **Auth**: Required
- **Body**: `{ name: string, description?: string }`
- **Response**: `UserGroupDetail` (201)

#### `PUT /api/userGroups/:id`
- **Description**: Update league name/description
- **Auth**: Required; league `ADMIN`
- **Body**: `{ name?: string, description?: string }`
- **Response**: `{ id, name, description, memberCount, contestCount, ... }`

#### `DELETE /api/userGroups/:id`
- **Description**: Delete league and memberships; contests keep `userGroupId` → null
- **Auth**: Required; league `ADMIN`
- **Response**: `{ success: boolean, message: string }`

#### `GET /api/userGroups/:id/members`
- **Description**: List league members
- **Auth**: Required; **members only** (`404` for non-members)
- **Response**: `{ members: UserGroupMember[] }`

#### `POST /api/userGroups/:id/members`
- **Description**: Add member by wallet address
- **Auth**: Required; league `ADMIN`
- **Body**: `{ walletAddress: string, role?: "MEMBER" | "ADMIN" }` (defaults to `MEMBER`)
- **Response**: `UserGroupMember` (201)

#### `DELETE /api/userGroups/:id/members/:userId`
- **Description**: Remove member (admin or self; cannot remove last admin)
- **Auth**: Required
- **Response**: `{ success: boolean, message: string }`

#### `POST /api/userGroups/:id/invite`
- **Description**: Generate or rotate invite code
- **Auth**: Required; league `ADMIN`
- **Response**: `{ inviteCode: string, inviteUrl: string }` — `inviteUrl` uses `APP_PUBLIC_URL` / `PUBLIC_APP_URL`

**Client routes:** `/user-groups`, `/user-groups/create`, `/user-groups/:id`, `/user-groups/join/:code`

### Cron (`/api/cron`)

#### `POST /api/cron/trigger`
- **Description**: Manually trigger cron pipeline (admin)
- **Auth**: Required (admin)
- **Response**: `{ success: boolean, message: string }`

## Response Formats

### Success Response
```json
{
  "data": { ... },
  "success": true
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": [ ... ] // Optional validation errors
}
```

## Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request (validation error)
- **401**: Unauthorized (authentication required)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **500**: Internal Server Error

## Caching

Some endpoints include cache headers:
- **Tournament Metadata**: 5 minutes
- **Tournament Data**: 2 minutes
- **Static Assets**: 1 hour

## Rate Limiting

Currently no rate limiting implemented. Consider adding for production.

## CORS

CORS configured for:
- Development: `http://localhost:5173`, `http://localhost:3000`
- Production: Configured via `ALLOWED_ORIGINS` environment variable

