-- Allow ContestLineup delete to remove timeline snapshots (leave contest while event is LIVE).
ALTER TABLE "ContestLineupTimeline" DROP CONSTRAINT "ContestLineupTimeline_contestLineupId_fkey";

ALTER TABLE "ContestLineupTimeline" ADD CONSTRAINT "ContestLineupTimeline_contestLineupId_fkey" FOREIGN KEY ("contestLineupId") REFERENCES "ContestLineup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
