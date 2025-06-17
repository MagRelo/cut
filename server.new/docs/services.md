# Services

## MANUAL:

initTournament(pgaTourId):

- update Tournament meta
- Update players: inField
- update player profiles

## SCHEDULED:

updateTournament():

- update Tournament meta-data from PGA
- update status, rounds, weather, course info

updateTournamentPlayers():

- update player scores and stats
- update contest lineup scores and positions

updateContestLineups():

- update contest lineup score
- update contest lineup positions

closeContest():

- find "OPEN" Contests where tournament is "IN_PROGRESS"
- call Contract.closeEntry()
- update contest status to "CLOSED"

distributeContest():

- find "CLOSED" Contests where tournament is "COMPLETED"
- calculate payouts based on scores
- Contract.distribute()
- update contest status to "SETTLED"
