/*
  Warnings:

  - Added the required column `chainId` to the `Contest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Contest" ADD COLUMN     "chainId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Contest_chainId_idx" ON "Contest"("chainId");

-- CreateIndex
CREATE INDEX "Contest_chainId_tournamentId_idx" ON "Contest"("chainId", "tournamentId");
