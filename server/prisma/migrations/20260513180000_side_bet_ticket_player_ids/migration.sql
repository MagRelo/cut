-- Side bet tickets: snapshot roster (`TournamentPlayer.id` per tournament) at placement.
ALTER TABLE "SideBetTicket" ADD COLUMN IF NOT EXISTS "playerIds" TEXT[] NOT NULL DEFAULT '{}';
