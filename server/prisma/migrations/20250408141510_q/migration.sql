/*
  Warnings:

  - You are about to drop the column `inFeild` on the `Player` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Player" DROP COLUMN "inFeild",
ADD COLUMN     "inField" BOOLEAN NOT NULL DEFAULT false;
