# Public League Functionality - Layout and Descriptions

The public league functionality allows users to create one or more leagues, create a single team within each league, and view the league leaderboard for the leagues they are in without logging in. There is no authentication; all id's will be stored in localStorage and league are retrieved automatically.

## Sections

1. League Management
   1.1: List leagues + Join
   1.2: Create a league
2. Public League Lobby
   2.1: League Info (Name)
   2.2: Teams List (all teams in the league and their players)
   2.3: Create/Edit Team
   2.4: Share league functionality

## Layout

### Mobile & Tablet

All sections are arranged into a vertical-stacked layout

### Desktop

All sections are arranged into a vertical-stacked layout

## API Calls

The public leagues functionality needs its own api service. it should follow the conventions in '/client/src/services/api.ts'. The following routes will be required:

- listLeagues
- createLeagues
- getLeague(leagueGUID)
- joinLeague(leagueGUID, userGUID)
- leaveLeague(leagueGUID, userGUID)
- createTeam(leagueGUID, userGUID)
- updateTeam(leagueGUID, userGUID)
