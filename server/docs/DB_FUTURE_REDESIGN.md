_This document shows how we may re-implement the db in the future. it should NOT be used for current work_

**Tables**

- User: manage system users, auth, settings
- UserGroup: Group of users to help organize contests
- Player: PGA data scraped from the web
- Tournament: PGA data scraped from the web
- TournamentPLayer: Players competing in the currently active Tournament
- TournamentPLayerTimeline: A log record summary of the TournamentPlayers scores at a defined interval
- TournamentLineup: User selection of 0-4 TournamentPlayer. Users can enter their TournamentLineup into 0-many contests
- Contest: A set of rules to for players to compete with.
- ContestLineup: Manage which TournamentLineups have opt-ed in to a particular contest
