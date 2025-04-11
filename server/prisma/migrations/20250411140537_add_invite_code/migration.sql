/*
  Warnings:

  - A unique constraint covering the columns `[inviteCode]` on the table `League` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "League" ADD COLUMN     "inviteCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "League_inviteCode_key" ON "League"("inviteCode");
