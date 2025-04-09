/*
  Warnings:

  - You are about to drop the column `teamId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,leagueId]` on the table `Team` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Team` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_teamId_fkey";

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "teamId";

-- CreateIndex
CREATE UNIQUE INDEX "Team_userId_leagueId_key" ON "Team"("userId", "leagueId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
