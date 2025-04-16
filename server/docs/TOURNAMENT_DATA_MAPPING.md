# Tournament Data Structure Comparison

This document compares our database Tournament model with the SportsRadar API tournament-related interfaces.

## Field Comparison Table

| Database Field (schema.prisma) | Tournament (SportsRadar) | TournamentSummary (SportsRadar) | TournamentLeaderboard (SportsRadar) | Notes                              |
| ------------------------------ | ------------------------ | ------------------------------- | ----------------------------------- | ---------------------------------- |
| id (String)                    | ✓                        | ✓                               | ✓                                   | Primary identifier                 |
| pgaTourId (String)             | -                        | -                               | -                                   | Our unique identifier for PGA Tour |
| name (String)                  | ✓                        | ✓                               | ✓                                   | Tournament name                    |
| startDate (DateTime)           | ✓ (start_date)           | ✓ (start_date)                  | ✓ (start_date)                      | Start date of tournament           |
| endDate (DateTime)             | ✓ (end_date)             | ✓ (end_date)                    | ✓ (end_date)                        | End date of tournament             |
| course (String)                | - (in venue)             | - (in venue)                    | - (in venue)                        | Course name                        |
| city (String)                  | - (in venue)             | - (in venue)                    | - (in venue)                        | City location                      |
| state (String)                 | - (in venue)             | - (in venue)                    | - (in venue)                        | State location                     |
| timezone (String)              | ✓ (course_timezone)      | -                               | ✓ (course_timezone)                 | Timezone information               |
| venue (Json)                   | ✓                        | ✓                               | -                                   | Venue details                      |
| purse (Float)                  | ✓                        | ✓                               | ✓                                   | Tournament purse                   |
| status (String)                | ✓                        | ✓                               | ✓                                   | Tournament status                  |
| roundStatusDisplay (String)    | ✓ (round_state)          | - (in rounds)                   | -                                   | Round status information           |
| roundDisplay (String)          | -                        | - (in rounds)                   | -                                   | Display format for round           |
| currentRound (Int)             | ✓                        | - (in rounds)                   | -                                   | Current round number               |
| weather (Json)                 | -                        | -                               | -                                   | Weather information                |
| beautyImage (String)           | -                        | -                               | -                                   | UI image                           |
| cutLine (String)               | ✓ (cut_line)             | -                               | ✓ (cutline)                         | Cut line information               |
| cutRound (String)              | ✓ (cut_round)            | -                               | ✓ (cut_round)                       | Cut round information              |

## Fields in SportsRadar not in Database

### Tournament

- `type`: Tournament type information
- `projected_cut_line`: Projected cut line value

### TournamentSummary

- `coverage`: Coverage information
- `currency`: Currency for purse
- `event_type`: Type of event
- `parent_id`: Parent tournament ID
- `points`: Tournament points
- `seasons`: Season information array
- `rounds`: Detailed round information array

### TournamentLeaderboard

- `event_type`: Type of event
- `winning_share`: Winner's purse share
- `currency`: Currency for purse
- `points`: Tournament points
- `parent_id`: Parent tournament ID
- `seasons`: Season information array
- `coverage`: Coverage information
- `playoff`: Playoff information
- `leaderboard`: Detailed leaderboard data
- `projected_cutline`: Projected cut line

## Recommendations

Consider adding the following fields to our database schema:

1. `eventType`: String - To capture tournament type/event type
2. `currency`: String - To specify purse currency
3. `points`: Int - Tournament points value
4. `projectedCutLine`: String - For projected cut line information
5. `winningShare`: Float - Winner's share of the purse
6. `coverage`: String - Coverage information
7. `parentId`: String? - For related tournament tracking

These additions would provide more parity with the SportsRadar API data structure while maintaining our current functionality.

## Data Flow Considerations

- The `venue` JSON field in our database already captures the detailed venue information from SportsRadar, including course details
- We separate location fields (city, state) at the top level for easier querying
- Our status field uses different enum values than SportsRadar ('UPCOMING', 'IN_PROGRESS', 'COMPLETED' vs 'scheduled', 'inprogress', 'completed', 'cancelled')
- We maintain additional UI-specific fields (beautyImage, roundDisplay) that aren't present in the API
- Weather data is stored separately in our schema, which isn't present in the SportsRadar API
