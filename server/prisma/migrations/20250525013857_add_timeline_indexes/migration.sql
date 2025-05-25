-- CreateIndex
CREATE INDEX "TimelineEntry_tournamentId_timestamp_idx" ON "TimelineEntry"("tournamentId", "timestamp");

-- CreateIndex
CREATE INDEX "TimelineEntry_leagueId_teamId_tournamentId_idx" ON "TimelineEntry"("leagueId", "teamId", "tournamentId");

-- CreateIndex
CREATE INDEX "TimelineEntry_timestamp_idx" ON "TimelineEntry"("timestamp");
