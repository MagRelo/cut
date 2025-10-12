# Services

## MANUAL:

### initTournament(pgaTourId):

- update **Tournament** meta
- update **Player** records to inField
- update **Player** profiles for players inField
- create **TournamentPlayer** records for players inField

## SCHEDULED:

### updateTournament():

- update **Tournament** meta-data from PGA (status, rounds, weather)

### updateTournamentPlayers():

- update **TournamentPlayer** scores

### updateContestLineups():

- update **ContestLineup** score & position

### closeContest():

- find "OPEN" **Contests** where **Tournament** status is "IN_PROGRESS"
- call **Contract.closeEntry()**
- update **Contest** status to "CLOSED"

### distributeContest():

- find **Contests** in status "CLOSED" where **Tournament** status is "COMPLETED"
- calculate payouts based on **ContestLineup** position
- Call **Contract.distribute()**
- Call **PlatformTokens.mintRewards()** equal to entry fee for all participants
- update **Contest** status to "SETTLED"
