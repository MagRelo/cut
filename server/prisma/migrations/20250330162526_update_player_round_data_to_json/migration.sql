/*
  Warnings:

  - The `r1` column on the `Player` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `r2` column on the `Player` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `r3` column on the `Player` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `r4` column on the `Player` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Player" DROP COLUMN "r1",
ADD COLUMN     "r1" JSONB,
DROP COLUMN "r2",
ADD COLUMN     "r2" JSONB,
DROP COLUMN "r3",
ADD COLUMN     "r3" JSONB,
DROP COLUMN "r4",
ADD COLUMN     "r4" JSONB;
