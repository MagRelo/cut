-- AlterTable
ALTER TABLE "Contest" ADD COLUMN "commentaryFeed" JSONB,
ADD COLUMN "commentaryFeedGeneratedAt" TIMESTAMP(3);
