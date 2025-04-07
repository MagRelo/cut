/*
  Warnings:

  - Added the required column `city` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timezone` to the `Tournament` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "beautyImage" TEXT,
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "currentRound" INTEGER,
ADD COLUMN     "roundDisplay" TEXT,
ADD COLUMN     "roundStatusDisplay" TEXT,
ADD COLUMN     "state" TEXT NOT NULL,
ADD COLUMN     "timezone" TEXT NOT NULL,
ADD COLUMN     "weather" JSONB;
