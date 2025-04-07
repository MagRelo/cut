/*
  Warnings:

  - You are about to drop the column `active` on the `Player` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Player" DROP COLUMN "active",
ADD COLUMN     "inFeild" BOOLEAN NOT NULL DEFAULT false;
