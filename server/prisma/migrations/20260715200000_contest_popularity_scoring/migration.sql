-- Contest-scoped popularity scoring (consensus-axis)
ALTER TABLE "Contest" ADD COLUMN "pickPopularity" JSONB;
ALTER TABLE "Contest" ADD COLUMN "pickPopularityLockedAt" TIMESTAMP(3);

ALTER TABLE "ContestLineup" ADD COLUMN "baseScore" INTEGER;
ALTER TABLE "ContestLineup" ADD COLUMN "popularityBonus" INTEGER;
