/*
  Warnings:

  - A unique constraint covering the columns `[contestId,entryId]` on the table `ContestLineup` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ContestLineup" ADD COLUMN     "entryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ContestLineup_contestId_entryId_key" ON "ContestLineup"("contestId", "entryId");

-- CreateIndex
CREATE INDEX "Tournament_manualActive_idx" ON "Tournament"("manualActive");
