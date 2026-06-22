-- AlterTable
ALTER TABLE "Lineup" ADD COLUMN     "contestId" TEXT;

-- CreateIndex
CREATE INDEX "Lineup_userId_eventId_contestId_idx" ON "Lineup"("userId", "eventId", "contestId");

-- AddForeignKey
ALTER TABLE "Lineup" ADD CONSTRAINT "Lineup_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
