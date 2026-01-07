# Server API Documentation

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

Most endpoints require authentication via SIWE (Sign-In With Ethereum):
1. POST `/api/auth/siwe/nonce` - Get nonce
2. POST `/api/auth/siwe/verify` - Verify signature and get JWT
3. JWT stored in HTTP-only cookie: `cutAuthToken`

## API Routes

### Health Check

#### `GET /api/health`
- **Description**: API health check
- **Auth**: None
- **Response**: `{ status: "healthy", service: "API", timestamp: string }`

### Authentication (`/api/auth`)

#### `POST /api/auth/siwe/nonce`
- **Description**: Generate SIWE nonce
- **Auth**: None
- **Response**: `{ nonce: string }`

#### `POST /api/auth/siwe/verify`
- **Description**: Verify SIWE signature and authenticate
- **Auth**: None
- **Body**: `{ message: string, signature: string }`
- **Response**: `{ success: boolean, user: User, token: string }`

#### `POST /api/auth/siwe/logout`
- **Description**: Logout user
- **Auth**: Required
- **Response**: `{ success: boolean, message: string }`

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

#### `GET /api/tournaments/active/metadata`
- **Description**: Get active tournament metadata (lightweight)
- **Auth**: None
- **Response**: `{ tournament: Tournament }`
- **Cache**: 5 minutes

#### `GET /api/tournaments/active`
- **Description**: Get active tournament with full data (players + contests)
- **Auth**: None
- **Response**: `{ tournament: Tournament, players: Player[] }`
- **Cache**: 2 minutes

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
- **Description**: Get contests by tournament and chain
- **Auth**: None
- **Query Params**:
  - `tournamentId`: string (required)
  - `chainId`: number (optional, defaults to all chains)
  - `userGroupId`: string (optional)
- **Response**: `Contest[]`

#### `GET /api/contests/:id`
- **Description**: Get contest by ID
- **Auth**: None
- **Response**: `Contest` (with lineups)

#### `GET /api/contests/:id/timeline`
- **Description**: Get contest timeline data
- **Auth**: None
- **Response**: `{ teams: TimelineTeam[] }`

#### `POST /api/contests`
- **Description**: Create new contest
- **Auth**: Required
- **Body**: `{ name: string, description?: string, tournamentId: string, userGroupId?: string, endDate: string|number, address: string, chainId: number, settings?: object }`
- **Response**: `Contest` (201)

#### `POST /api/contests/:id/lineups`
- **Description**: Add lineup to contest
- **Auth**: Required
- **Body**: `{ tournamentLineupId: string, entryId: string }`
- **Response**: `Contest` (201)

#### `DELETE /api/contests/:id/lineups/:lineupId`
- **Description**: Remove lineup from contest
- **Auth**: Required
- **Response**: `Contest`

### User Groups (`/api/user-groups`)

#### `GET /api/user-groups`
- **Description**: Get all user groups
- **Auth**: Required
- **Response**: `UserGroup[]`

#### `GET /api/user-groups/:id`
- **Description**: Get user group by ID
- **Auth**: Required
- **Response**: `UserGroup`

#### `POST /api/user-groups`
- **Description**: Create new user group
- **Auth**: Required
- **Body**: `{ name: string, description?: string }`
- **Response**: `UserGroup` (201)

#### `PUT /api/user-groups/:id`
- **Description**: Update user group
- **Auth**: Required
- **Body**: `{ name?: string, description?: string }`
- **Response**: `UserGroup`

#### `DELETE /api/user-groups/:id`
- **Description**: Delete user group
- **Auth**: Required
- **Response**: `{ success: boolean }`

#### `POST /api/user-groups/:id/members`
- **Description**: Add member to user group
- **Auth**: Required
- **Body**: `{ userId: string }`
- **Response**: `UserGroupMember`

#### `DELETE /api/user-groups/:id/members/:memberId`
- **Description**: Remove member from user group
- **Auth**: Required
- **Response**: `{ success: boolean }`

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

