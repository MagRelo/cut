-- AlterTable
ALTER TABLE "TournamentLineup" ADD COLUMN "winningScorePrediction" INTEGER;

-- Backfill legacy lineups with random values in 125–175 (150 ± 25)
UPDATE "TournamentLineup"
SET "winningScorePrediction" = 125 + floor(random() * 51)::int
WHERE "winningScorePrediction" IS NULL;
