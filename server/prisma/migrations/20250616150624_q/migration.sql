/*
  Warnings:

  - You are about to drop the column `endDate` on the `Contest` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Contest` table. All the data in the column will be lost.
  - Added the required column `address` to the `Contest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endTime` to the `Contest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Contest" DROP COLUMN "endDate",
DROP COLUMN "startDate",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL;
