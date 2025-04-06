/*
  Warnings:

  - You are about to drop the column `bonus` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `cut` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `leaderboardPosition` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `r1` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `r2` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `r3` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `r4` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `Player` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[pgaTourId]` on the table `Player` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Player" DROP COLUMN "bonus",
DROP COLUMN "cut",
DROP COLUMN "isActive",
DROP COLUMN "leaderboardPosition",
DROP COLUMN "r1",
DROP COLUMN "r2",
DROP COLUMN "r3",
DROP COLUMN "r4",
DROP COLUMN "total",
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "hometown" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "course" TEXT NOT NULL,
    "purse" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentPlayer" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "leaderboardPosition" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "r1Score" INTEGER,
    "r2Score" INTEGER,
    "r3Score" INTEGER,
    "r4Score" INTEGER,
    "totalScore" INTEGER,
    "cut" BOOLEAN NOT NULL DEFAULT false,
    "earnings" DOUBLE PRECISION,
    "fedExPoints" INTEGER,
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

-- CreateIndex
CREATE UNIQUE INDEX "Player_pgaTourId_key" ON "Player"("pgaTourId");

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
