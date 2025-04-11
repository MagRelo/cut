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

     4. Award "Cut" points and "Place" points.

     - Players also get points for "making the cut" and "placing", ie, finishing in the top 3

       1. Making the Cut: to award these points we first have to determine if "the cut" has been made (it is not made in every tournament). We can determine if it been made by whether any player on the leader board has a leaderboardPosition of "CUT". If the cut has been made, all other players (who have a leaderboard position that is not "CUT) are awarded 3 points. This is stored in the "TournamentPlayer.cut" field, which is an integer. these points count toward the team total and should be included in any "team total" calculations

       2. Placement points: players are awarded bonus points if they hold a position in the top 3, ie their leaderboard position is "1", "T1", "2", "T2", etc. This is stored in the "TournamentPlayer.bonus" field, which is an integer.Here is some example pseudo code to help your direction:

       ```
           // POSITION
       const position = player.scoringData.position
       ```

   // POSITION BONUS
   let positionBonus = 0
   if(position == "1" || position == "T1"){
   positionBonus = 10
   }
   if(position == "2" || position == "T2"){
   positionBonus = 5
   }
   if(position == "3" || position == "T3"){
   positionBonus = 3
   }

   // CUT BONUS  
    const losePointPositions = ["CUT", "WD"]
   const validPosition = !losePointPositions.includes(position)
   const cutBonus = blnCutHasBeenMade && validPosition ? 3: 0

   ```

   - Each cron run should be recorded in a table called SystemProcessRecord. This table should record the processType, status ("SUCCESS, FAILURE") and store any important information in a json field called processData. For the score update service this data will include the Tournament id, pgaTourId, status, roundStatusDisplay, and how may records of each type were created or updated.
   ```
