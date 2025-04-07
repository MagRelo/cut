# PGA Data

## Overview

In order to manage the season of PGA golf tournaments we will need to get and store information from the PGA Tour API. We need the following:

2. PGA Golfers: list of all PGA players. Code: server/src/lib/pgaPlayers.ts

3. Active Players (ie, "in the field"): list of which players are active for the current tournament. Code: server/src/lib/pgaField.ts

4. Live Leaderboard: this is used to get updates about tournament status and weather. Code: server/src/lib/pgaLeaderboard.ts

5. Player scorecard: this is used to calculate player's stableford scores based on their scoring. Code: server/src/lib/pgaScorecard.ts
