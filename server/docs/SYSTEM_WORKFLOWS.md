# System Workflows

## Overview

1. Tournament Creation

   - Tournaments are created manually via the API.
   - Tournament statuses are updated manually via the API.

2. Team Management

   - Users can set and update team lineups while the tournament is in status of "UPCOMING". Users cannot edit team lineups while the tournament is in status "IN_PROGRESS" or "COMPLETED"
   - If a user does not set a lineup then they do not score any points in that league for that tournament.

3. Scoring Updates

   - Scores are updated every 10 minutes via cron job while tournament is in status of "IN_PROGRESS". The cron job should not update scores if there is no tournament in status of "IN_PROGRESS"
