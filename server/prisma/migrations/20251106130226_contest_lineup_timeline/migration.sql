/*
  Warnings:

  - You are about to drop the `TournamentPlayerTimeline` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TournamentPlayerTimeline" DROP CONSTRAINT "TournamentPlayerTimeline_playerId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentPlayerTimeline" DROP CONSTRAINT "TournamentPlayerTimeline_tournamentId_fkey";

-- DropTable
DROP TABLE "TournamentPlayerTimeline";

-- CreateTable
CREATE TABLE "ContestLineupTimeline" (
    "id" TEXT NOT NULL,
    "contestLineupId" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestLineupTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContestLineupTimeline_contestId_timestamp_idx" ON "ContestLineupTimeline"("contestId", "timestamp");

-- CreateIndex
CREATE INDEX "ContestLineupTimeline_contestLineupId_timestamp_idx" ON "ContestLineupTimeline"("contestLineupId", "timestamp");

-- AddForeignKey
ALTER TABLE "ContestLineupTimeline" ADD CONSTRAINT "ContestLineupTimeline_contestLineupId_fkey" FOREIGN KEY ("contestLineupId") REFERENCES "ContestLineup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestLineupTimeline" ADD CONSTRAINT "ContestLineupTimeline_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
