/*
  Warnings:

  - You are about to drop the column `position` on the `Player` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Player" DROP COLUMN "position",
ADD COLUMN     "leaderboardPosition" TEXT;
