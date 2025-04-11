# Timeline Data Collection and Display System

## Overview

The timeline feature displays team score progression over time during a tournament. Data is collected every 10 minutes via a cron job and displayed as a line chart showing each team's performance trajectory.

## Data Model

### Timeline Entry

```prisma
model TimelineEntry {
  id          String   @id @default(cuid())
  leagueId    String
  teamId      String
  tournamentId String
  timestamp   DateTime
  totalScore  Int
  roundNumber Int?     // Current round when score was recorded

  league      League     @relation(fields: [leagueId], references: [id])
  team        Team       @relation(fields: [teamId], references: [id])
  tournament  Tournament @relation(fields: [tournamentId], references: [id])

  @@index([leagueId, tournamentId, timestamp])
  @@index([teamId, tournamentId, timestamp])
}
```

## Data Collection Process

1. **Score Update Cron Job Enhancement**

   - After updating individual player scores in the existing cron job
   - Calculate and store total scores for each team in active leagues
   - Store timestamp with each entry for time-series display

2. **Data Retention**
   - Keep timeline data for the duration of the tournament
   - Clean up old timeline data when tournament completes
   - Consider data pruning strategies for long-running tournaments

## API Endpoints

### GET /api/leagues/:leagueId/timeline

- Parameters:

  - `leagueId`: string (required)
  - `tournamentId`: string (required)
  - `startTime`: ISO timestamp (optional)
  - `endTime`: ISO timestamp (optional)
  - `interval`: number (optional, minutes, default: 10)

- Response:

```typescript
interface TimelineResponse {
  teams: {
    id: string;
    name: string;
    color: string;
    dataPoints: {
      timestamp: string;
      score: number;
      roundNumber?: number;
    }[];
  }[];
  tournament: {
    id: string;
    name: string;
    currentRound: number;
    status: string;
  };
}
```

## Implementation Phases

### Phase 1: Data Collection

1. Create TimelineEntry database model
2. Modify score update service to calculate team totals
3. Add timeline entry creation to cron job
4. Implement data cleanup for completed tournaments

### Phase 2: API Development

1. Create timeline data service
2. Implement GET endpoint for timeline data
3. Add data aggregation and formatting logic
4. Implement optional data point interpolation for missing intervals

### Phase 3: Frontend Integration

1. Update Timeline component to accept real data
2. Add data fetching logic with proper error handling
3. Implement real-time updates (optional, via WebSocket)
4. Add loading states and error handling to chart

## Technical Considerations

### Performance

- Index optimization for time-series queries
- Consider data point aggregation for longer time ranges
- Implement caching for frequently accessed timeline data

### Data Integrity

- Handle missing data points gracefully
- Ensure consistent score calculations
- Validate data before storage

### Scalability

- Design for multiple concurrent tournaments
- Consider data partitioning for historical tournaments
- Plan for database growth over time

## Future Enhancements

1. **Real-time Updates**

   - WebSocket integration for live score updates
   - Smooth chart animations for new data points

2. **Data Analysis**

   - Track significant score changes
   - Identify trending teams
   - Generate performance insights

3. **User Experience**
   - Interactive chart tooltips with detailed information
   - Time range selection controls
   - Team filtering options
   - Round markers and annotations
