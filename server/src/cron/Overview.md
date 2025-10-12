These services need to be organized into a series of cron jobs that run at appropriate intervals.

Run manually:

- Initialize the new tournament (initTournament.ts)

Run every 5 minutes:

- Update the current tournament (updateTournament.ts)
- Close escrow deposits (closeEscrowDeposits.ts)
  - updates contests and contracts where tournament.status == IN_PROGRESS but contest.status == OPEN
- Distribute contests (distributeContests.ts)
  - updates contests and contracts where tournament.status == COMPLETED but contest.status == IN_PROGRESS

Run every 5 minutes but skip if
(
tournament.roundStatusDisplay !== 'In Progress' &&
tournament.roundStatusDisplay !== 'Complete'
):

- Update the player scores (updateTournamentPlayers.ts)
- Update the contest lineup totals (updateContestLineups.ts)
