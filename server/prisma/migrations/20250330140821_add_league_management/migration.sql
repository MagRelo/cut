/*
  Warnings:

  - Added the required column `commissionerId` to the `League` table without a default value. This is not possible if the table is not empty.

*/
-- First add the column as nullable
ALTER TABLE "League" ADD COLUMN "commissionerId" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "maxTeams" INTEGER NOT NULL DEFAULT 8;

-- Create a default user if none exists
INSERT INTO "User" ("id", "email", "password", "name", "emailVerified", "createdAt", "updatedAt")
SELECT 'default-commissioner', 'default@example.com', '$2a$10$default', 'Default Commissioner', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User");

-- Update existing leagues with a default commissioner
UPDATE "League" SET "commissionerId" = (SELECT id FROM "User" LIMIT 1);

-- Make commissionerId required
ALTER TABLE "League" ALTER COLUMN "commissionerId" SET NOT NULL;

-- CreateTable
CREATE TABLE "LeagueSettings" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterSize" INTEGER NOT NULL DEFAULT 8,
    "weeklyStarters" INTEGER NOT NULL DEFAULT 4,
    "scoringType" TEXT NOT NULL DEFAULT 'STABLEFORD',
    "draftDate" TIMESTAMP(3),
    "seasonStart" TIMESTAMP(3),
    "seasonEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeagueSettings_leagueId_key" ON "LeagueSettings"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMembership_userId_leagueId_key" ON "LeagueMembership"("userId", "leagueId");

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_commissionerId_fkey" FOREIGN KEY ("commissionerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueSettings" ADD CONSTRAINT "LeagueSettings_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMembership" ADD CONSTRAINT "LeagueMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMembership" ADD CONSTRAINT "LeagueMembership_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create default settings for existing leagues
INSERT INTO "LeagueSettings" ("id", "leagueId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "League";

-- Create memberships for existing leagues
INSERT INTO "LeagueMembership" ("id", "userId", "leagueId", "role", "joinedAt")
SELECT gen_random_uuid(), "commissionerId", id, 'COMMISSIONER', CURRENT_TIMESTAMP
FROM "League";
