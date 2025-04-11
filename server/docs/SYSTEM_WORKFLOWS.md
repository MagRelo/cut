# System Workflows

## Overview

1. Tournament Creation

   - Tournaments are created manually via the API.
   - Tournament statuses are updated manually via the API.

2. Team Management

   - Users can set and update team lineups while the tournament is in status of "UPCOMING". Users cannot edit team lineups while the tournament is in status "IN_PROGRESS" or "COMPLETED"
   - If a user does not set a lineup then they do not score any points in that league for that tournament.

3. Scoring Updates - cron job: scoreUpdate.ts

   - Scores are updated every 10 minutes via cron job. The lifecyle of automatic updates is based on the current Tournament and the important fields that drive this process are "Tournament.status" which indicates whether the tournament is in progress, and "Tournament.roundStatusDisplay" which indicates whether the tournament is in progress. The scoreUpdate job has three main functions:

     1. Update the Tournament record

     - Always update the tournament record. Start with the most recently updated Tournament record, and check it's pgaTourId. Then fetch the latest leaderboard and compare the pgaTourId - if it is the same then update the current record. if its different then insert a new Tournament record.

     2. Update the player scores

     - Players scores do not change unless the round is in progress so only update if the "Tournament.roundStatusDisplay" is equal to "In Progress" or "Complete"

     3. Create Timeline entries

     - Players scores do not change unless the round is in progress so only update if the "Tournament.roundStatusDisplay" is equal to "In Progress" or "Complete"

   - Each cron run should be recorded in a table called SystemProcessRecord. This table should record the processType, status ("SUCCESS, FAILURE") and store any important information in a json field called processData. For the score update service this data will include the Tournament id, pgaTourId, status, roundStatusDisplay, and how may records of each type were created or updated.
