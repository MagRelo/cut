-- CreateTable
CREATE TABLE "CommentaryFeedJob" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommentaryFeedJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommentaryFeedJob_status_runAfter_idx" ON "CommentaryFeedJob"("status", "runAfter");

-- CreateIndex
CREATE INDEX "CommentaryFeedJob_contestId_status_idx" ON "CommentaryFeedJob"("contestId", "status");

-- AddForeignKey
ALTER TABLE "CommentaryFeedJob" ADD CONSTRAINT "CommentaryFeedJob_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
