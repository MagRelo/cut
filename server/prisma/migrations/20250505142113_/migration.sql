/*
  Warnings:

  - You are about to drop the column `abbr_name` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `birth_place` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `birthday` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `college` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `first_name` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `handedness` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `member` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `residence` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `sportsRadarId` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `turned_pro` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `sportsRadarId` on the `Tournament` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Player_sportsRadarId_idx";

-- DropIndex
DROP INDEX "Player_sportsRadarId_key";

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "abbr_name",
DROP COLUMN "birth_place",
DROP COLUMN "birthday",
DROP COLUMN "college",
DROP COLUMN "country",
DROP COLUMN "first_name",
DROP COLUMN "handedness",
DROP COLUMN "height",
DROP COLUMN "last_name",
DROP COLUMN "member",
DROP COLUMN "name",
DROP COLUMN "residence",
DROP COLUMN "sportsRadarId",
DROP COLUMN "turned_pro",
DROP COLUMN "weight",
ADD COLUMN     "pga_age" INTEGER,
ADD COLUMN     "pga_country" TEXT,
ADD COLUMN     "pga_countryFlag" TEXT,
ADD COLUMN     "pga_firstName" TEXT,
ADD COLUMN     "pga_lastName" TEXT,
ADD COLUMN     "pga_shortName" TEXT;

-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "sportsRadarId";
