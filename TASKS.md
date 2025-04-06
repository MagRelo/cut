# Project Implementation Tasks

This task list tracks the implementation progress of the project features and components.

## Completed Tasks

## In Progress Tasks

## Future Tasks

- [ ] Restructure Player and Tournament Data Models

  **Objective**: Separate player profile data from tournament performance data for better data organization and scalability.

  **Changes Required**:

  1. Modify Player table to only contain static profile information:

     ```prisma
     model Player {
       id        String   @id @default(cuid())
       pgaTourId String?  @unique
       name      String
       imageUrl  String?
       hometown  String?
       age       Int?
       teams     Team[]
       tournaments TournamentPlayer[]
       createdAt DateTime @default(now())
       updatedAt DateTime @updatedAt
     }
     ```

  2. Create Tournament table for weekly events:

     ```prisma
     model Tournament {
       id          String   @id @default(cuid())
       name        String
       startDate   DateTime
       endDate     DateTime
       course      String
       purse       Float?
       status      String   // UPCOMING, IN_PROGRESS, COMPLETED
       players     TournamentPlayer[]
       createdAt   DateTime @default(now())
       updatedAt   DateTime @updatedAt
     }
     ```

  3. Create TournamentPlayer table for player performance:

     ```prisma
     model TournamentPlayer {
       id                 String   @id @default(cuid())
       tournament        Tournament @relation(fields: [tournamentId], references: [id])
       tournamentId      String
       player           Player    @relation(fields: [playerId], references: [id])
       playerId         String
       leaderboardPosition Int?
       isActive         Boolean   @default(true)
       r1Score          Int?      // Round scores in Stableford format
       r2Score          Int?
       r3Score          Int?
       r4Score          Int?
       totalScore       Int?
       cut              Boolean   @default(false)
       earnings         Float?
       fedExPoints      Int?
       createdAt        DateTime @default(now())
       updatedAt        DateTime @updatedAt

       @@unique([tournamentId, playerId])
       @@index([tournamentId])
       @@index([playerId])
     }
     ```

  **Benefits**:

  - Clear separation between player profile data and tournament performance
  - Improved data querying and relationships
  - Better support for historical tournament data
  - Simplified player profile updates
  - More efficient data storage

  **Implementation Steps**:

  1. Create migration for new table structure
  2. Update API endpoints to handle new data model
  3. Modify frontend components to work with restructured data
  4. Create data migration script to move existing data to new structure
  5. Update tournament data fetching service to work with new model

## Implementation Plan

The project will be built as a full-stack application with a React frontend and Express backend. We'll follow these key principles:

1. Modular component architecture
2. RESTful API design
3. Secure authentication practices
4. Comprehensive testing coverage

### Relevant Files

#### Server

- `server/index.js` - Main Express server setup
- `server/routes/` - API route definitions
- `server/middleware/` - Custom middleware functions
- `server/controllers/` - Request handlers
- `server/models/` - Data models

#### Client

- `client/src/App.js` - Main React application
- `client/src/components/` - Reusable UI components
- `client/src/pages/` - Page components
- `client/src/utils/` - Helper functions
- `client/src/styles/` - Styling files
