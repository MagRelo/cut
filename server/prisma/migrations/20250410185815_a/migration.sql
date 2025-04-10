/*
  Warnings:

  - A unique constraint covering the columns `[pgaTourId]` on the table `Tournament` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pgaTourId` to the `Tournament` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "pgaTourId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_pgaTourId_key" ON "Tournament"("pgaTourId");
