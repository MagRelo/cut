/*
  Warnings:

  - Added the required column `leagueId` to the `Team` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- Create a default league
INSERT INTO "League" ("id", "name", "createdAt", "updatedAt")
VALUES ('default-league', 'Default League', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "Team" ADD COLUMN "leagueId" TEXT NOT NULL DEFAULT 'default-league';

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
