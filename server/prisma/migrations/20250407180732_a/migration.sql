/*
  Warnings:

  - You are about to drop the column `hometown` on the `Player` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Player" DROP COLUMN "hometown",
ADD COLUMN     "country" TEXT,
ADD COLUMN     "countryFlag" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastName" TEXT;
