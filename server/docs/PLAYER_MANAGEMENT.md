# Player Management Architecture

## Overview

The player management system is split into two main components:

1. Player Management (PGA Tour Data)
2. Team Player Management (Fantasy Team Relationships)

This separation allows for clearer responsibility boundaries and better type safety.

## Player Controller (`playerController.ts`)

Responsible for managing core player data synchronized from PGA Tour:

- Player biographical information
- PGA Tour IDs
- Player statistics
- External data synchronization

### Endpoints

```
GET    /api/players              # List all players
GET    /api/players/:id          # Get player details
POST   /api/players              # Create player (admin only)
PUT    /api/players/:id          # Update player (admin only)
DELETE /api/players/:id          # Delete player (admin only)
POST   /api/players/sync         # Sync with PGA Tour data
```

## Team Player Controller (`teamPlayerController.ts`)

Manages the relationship between teams and players:

- Team roster management
- Weekly player selections
- Team composition rules

### Endpoints

```
POST   /api/team-players                  # Add player to team
DELETE /api/team-players/:teamId/:playerId # Remove player from team
GET    /api/team-players/team/:teamId     # Get team's players
GET    /api/team-players/player/:playerId # Get player's teams
PATCH  /api/team-players/:teamId/:playerId # Update active status
```

## Data Models

### Player Schema

```typescript
{
  name: string;
  pgaTourId?: string;
  imageUrl?: string;
  hometown?: string;
  age?: number;
}
```

### Team Player Schema

```typescript
{
  teamId: string;
  playerId: string;
  active: boolean;
}
```

## Validation

All requests are validated using Zod schemas:

- `player.ts`: Schemas for player operations
- `teamPlayer.ts`: Schemas for team-player operations
- `validateRequest.ts`: Middleware for request validation

## Error Handling

- 400: Validation errors (malformed requests)
- 404: Resource not found
- 500: Server errors

## Future Improvements

1. Add caching for frequently accessed player data
2. Implement batch operations for team roster updates
3. Add statistics aggregation endpoints
4. Implement real-time updates for active player status
