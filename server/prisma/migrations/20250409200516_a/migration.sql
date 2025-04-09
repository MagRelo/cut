-- AlterTable
ALTER TABLE "TeamPlayer" ADD COLUMN     "bonus" INTEGER,
ADD COLUMN     "cut" INTEGER,
ADD COLUMN     "leaderboardPosition" TEXT,
ADD COLUMN     "r1" JSONB,
ADD COLUMN     "r2" JSONB,
ADD COLUMN     "r3" JSONB,
ADD COLUMN     "r4" JSONB,
ADD COLUMN     "total" INTEGER;
