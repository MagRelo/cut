/*
  Warnings:

  - You are about to drop the column `bonus` on the `TeamPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `cut` on the `TeamPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `leaderboardPosition` on the `TeamPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `r1` on the `TeamPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `r2` on the `TeamPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `r3` on the `TeamPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `r4` on the `TeamPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `TeamPlayer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TeamPlayer" DROP COLUMN "bonus",
DROP COLUMN "cut",
DROP COLUMN "leaderboardPosition",
DROP COLUMN "r1",
DROP COLUMN "r2",
DROP COLUMN "r3",
DROP COLUMN "r4",
DROP COLUMN "total";

-- CreateTable
CREATE TABLE "TournamentPlayer" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "leaderboardPosition" TEXT,
    "r1" JSONB,
    "r2" JSONB,
    "r3" JSONB,
    "r4" JSONB,
    "cut" INTEGER,
    "bonus" INTEGER,
    "total" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentPlayer_tournamentId_idx" ON "TournamentPlayer"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentPlayer_playerId_idx" ON "TournamentPlayer"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPlayer_tournamentId_playerId_key" ON "TournamentPlayer"("tournamentId", "playerId");

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
