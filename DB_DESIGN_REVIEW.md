I'll analyze the database design by comparing the stated goals in `project-overview.mdc` with the implementation details in `prisma-database.mdc`.

Key Features from Project Overview:

1. User Management
2. League Management
3. Team Management (8 players per team, 4 active per week)
4. PGA Tour data integration
5. Betting functionality

Let's analyze each aspect:

### Strong Points in Current Design

1. **Player Independence**

   - The design correctly keeps Players as independent entities
   - TeamPlayer junction table allows for flexible team assignments
   - This supports both fantasy teams and real tournament tracking

2. **League Structure**

   - Good separation between League and LeagueSettings
   - LeagueMembership handles multi-league participation well
   - Commissioner role is properly tracked

3. **Tournament Tracking**
   - TournamentPlayer table effectively tracks real tournament performance
   - Separation between fantasy teams and actual tournaments is clean

### Areas Needing Clarification

1. **Weekly Lineup Management**

   ```markdown
   Vague Area: The documentation doesn't specify how weekly lineups are tracked
   Current Issue: While we know teams have 8 players and select 4 weekly, there's no table for tracking active/inactive status per tournament
   Suggestion: Add a WeeklyLineup or TournamentLineup table:

   - Fields: id, teamId, tournamentId, playerId, isActive
   - Purpose: Track which 4 of 8 players are active for each tournament
   ```

2. **Betting Integration**

   ```markdown
   Vague Area: The relationship between UserOrderLog and Tournaments/Players
   Current Issue: UserOrderLog only tracks Hyperliquid orders but doesn't link to specific tournaments/players
   Suggestion: Consider adding:

   - BettingMarket table to define what can be bet on
   - Link UserOrderLog to specific tournaments, players, or fantasy matchups
   ```

3. **Scoring System**

   ```markdown
   Vague Area: How stableford scoring is calculated and stored
   Current Issue: LeagueSettings mentions scoringType but implementation details are unclear
   Suggestion: Add documentation for:

   - How scores are calculated
   - Where/how they're stored
   - How they relate to both fantasy teams and real tournaments
   ```

4. **Tournament Schedule Management**
   ```markdown
   Vague Area: How upcoming tournaments are tracked
   Current Issue: Tournament table exists but scheduling logic isn't detailed
   Suggestion: Add fields or documentation for:

   - Tournament registration deadlines
   - Fantasy lineup submission deadlines
   - Tournament status transitions (upcoming → in-progress → completed)
   ```

### Suggested Documentation Updates

1. **Add a "System Workflows" section:**

```markdown
## System Workflows

### Weekly Tournament Cycle

1. Tournament Creation

   - How/when tournaments are added to the system
   - Registration deadlines
   - Lineup submission windows

2. Team Management

   - When/how teams select their weekly active players
   - Deadline for lineup changes
   - Handling missed lineup submissions

3. Scoring Updates

   - How often scores are updated
   - Stableford calculation process
   - Score finalization process

4. Betting Integration
   - Types of bets supported
   - How bets are linked to tournament/fantasy outcomes
   - Settlement process
```

2. **Add a "Data Synchronization" section:**

```markdown
## Data Synchronization

1. PGA Tour Data

   - Frequency of player data updates
   - Tournament data refresh schedule
   - Error handling for missing/incomplete data

2. Hyperliquid Integration
   - Order types supported
   - How orders are linked to golf events
   - Settlement triggers
```

### Suggested Schema Additions

Consider adding these tables to the schema documentation:

1. **WeeklyLineup**

   - Purpose: Track active players for each team per tournament
   - Fields: id, teamId, tournamentId, weekStartDate, weekEndDate
   - Relations: team, tournament, activePlayerSelections

2. **WeeklyPlayerSelection**

   - Purpose: Track which players are active/inactive each week
   - Fields: id, lineupId, playerId, isActive
   - Relations: weeklyLineup, player

3. **BettingMarket**
   - Purpose: Define available betting markets
   - Fields: id, tournamentId, marketType, status
   - Relations: tournament, userOrderLogs

Would you like me to elaborate on any of these areas or suggest additional improvements to the documentation?
