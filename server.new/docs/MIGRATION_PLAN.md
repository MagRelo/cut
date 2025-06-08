# Server Migration Plan

## Overview

This document outlines the plan for migrating from the current server implementation to the new one. The migration will be done incrementally to ensure stability and maintainability.

## Major Changes

### Database Schema Changes

1. Removed:

   - League/LeagueSettings models (replaced by UserGroup)
   - LeagueMembership model (replaced by UserGroupMember)
   - Team/LeagueTeam models (replaced by TournamentLineup)
   - TeamPlayer model (replaced by TournamentLineupPlayer)
   - TimelineEntry model (replaced by TournamentPlayerTimeline)

2. Added:
   - UserGroup and UserGroupMember models for better user organization
   - TournamentLineup and TournamentLineupPlayer for managing player selections
   - Contest and ContestLineup for managing competitions
   - TournamentPlayerTimeline for better score tracking

### Key Improvements

1. Simplified user organization with UserGroups
2. More flexible contest system
3. Better separation of concerns between tournaments and contests
4. Improved timeline tracking for player scores
5. More efficient lineup management

## Migration Steps

### Phase 1: Database Migration

1. Create new database schema
2. Write migration scripts to transfer data:
   - Users
   - Players
   - Tournaments
   - Tournament Players

### Phase 2: API Implementation

1. Set up new server structure
2. Implement core routes:
   - User management
   - Tournament management
   - Player management
   - Contest management
   - Lineup management

### Phase 3: Data Migration

1. Migrate existing data to new schema
2. Validate data integrity
3. Run parallel systems to verify functionality

### Phase 4: Testing & Validation

1. Unit tests for new implementation
2. Integration tests
3. Performance testing
4. Security audit

### Phase 5: Deployment

1. Deploy new server
2. Monitor for issues
3. Rollback plan if needed

## Next Steps

1. Review and finalize schema design
2. Begin implementing core models and relationships
3. Set up basic API structure
4. Create migration scripts

## Notes

- Keep old implementation running until new one is fully tested
- Maintain backward compatibility where possible
- Document all API changes
- Create comprehensive test suite
