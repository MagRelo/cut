# API Routes Documentation

This document provides a comprehensive list of all API routes available in the Cut application.

## Authentication Routes

Base path: `/api/auth`

### Public Routes

| Method | Path               | Description                             |
| ------ | ------------------ | --------------------------------------- |
| POST   | `/login`           | Authenticate user and receive JWT token |
| POST   | `/register`        | Create a new user account               |
| POST   | `/forgot-password` | Request password reset email            |

### Protected Routes

| Method | Path              | Description                            |
| ------ | ----------------- | -------------------------------------- |
| GET    | `/me`             | Get current user's profile information |
| POST   | `/reset-password` | Reset password using token from email  |

## Tournament Routes

Base path: `/api/tournaments`

### Public Routes

| Method | Path   | Description          |
| ------ | ------ | -------------------- |
| GET    | `/`    | Get all tournaments  |
| GET    | `/:id` | Get tournament by ID |

### Protected Routes

| Method | Path                 | Description                                 |
| ------ | -------------------- | ------------------------------------------- |
| POST   | `/`                  | Create a new tournament                     |
| PUT    | `/:id`               | Update tournament details                   |
| DELETE | `/:id`               | Delete a tournament                         |
| POST   | `/:id/update-scores` | Update tournament scores from PGA Tour data |

## Player Routes

Base path: `/api/players`

### Public Routes

| Method | Path   | Description      |
| ------ | ------ | ---------------- |
| GET    | `/`    | Get all players  |
| GET    | `/:id` | Get player by ID |

### Protected Routes

| Method | Path         | Description         |
| ------ | ------------ | ------------------- |
| POST   | `/`          | Create a new player |
| GET    | `/:id/teams` | Get player's teams  |

## League Routes

Base path: `/api/leagues`

### Protected Routes

| Method | Path                  | Description              |
| ------ | --------------------- | ------------------------ |
| POST   | `/`                   | Create a new league      |
| GET    | `/`                   | List all leagues         |
| DELETE | `/:id`                | Delete a league          |
| POST   | `/:id/join`           | Join a league            |
| POST   | `/:id/leave`          | Leave a league           |
| PUT    | `/:id/settings`       | Update league settings   |
| GET    | `/:leagueId/timeline` | Get league timeline data |

## Team Routes

Base path: `/api/teams`

### Protected Routes

| Method | Path                | Description               |
| ------ | ------------------- | ------------------------- |
| POST   | `/`                 | Create a new team         |
| DELETE | `/:teamId`          | Delete a team             |
| GET    | `/league/:leagueId` | Get all teams in a league |

## PGA Tour Routes

Base path: `/api/pga`

### Public Routes

| Method | Path                                 | Description                         |
| ------ | ------------------------------------ | ----------------------------------- |
| GET    | `/players`                           | Get PGA Tour players list           |
| GET    | `/leaderboard`                       | Get PGA Tour leaderboard data       |
| GET    | `/scorecard/:playerId/:tournamentId` | Get player scorecard for tournament |
| GET    | `/field/:tournamentId`               | Get active players for tournament   |
| GET    | `/odds/:tournamentKey`               | Get tournament odds from bookmakers |

### Protected Routes

| Method | Path               | Description              |
| ------ | ------------------ | ------------------------ |
| POST   | `/players/refresh` | Refresh PGA Tour players |

## Hyperliquid Routes

Base path: `/api/hyperliquid`

### Public Routes

| Method | Path         | Description           |
| ------ | ------------ | --------------------- |
| GET    | `/balance`   | Get wallet balance    |
| GET    | `/positions` | Get current positions |

### Protected Routes

| Method | Path              | Description             |
| ------ | ----------------- | ----------------------- |
| POST   | `/order`          | Place a new order       |
| GET    | `/order/:orderId` | Get order status        |
| GET    | `/open-orders`    | Get list of open orders |

## Chat Routes

Base path: `/api/chat`

### Protected Routes

| Method | Path                         | Description                |
| ------ | ---------------------------- | -------------------------- |
| GET    | `/leagues/:leagueId/channel` | Get league channel details |

## Authentication

Protected routes require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

The token is obtained by logging in through the `/api/auth/login` endpoint.

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "error": "Error message description",
  "details": [] // Optional array of validation error details
}
```

Common HTTP status codes:

- 200: Success
- 201: Created
- 204: No Content
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error
