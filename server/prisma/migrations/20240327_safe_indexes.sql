-- Safe migration to add indexes and unique constraints
-- This migration only adds performance improvements and unique constraints
-- No data will be modified or deleted

-- Player table indexes
CREATE INDEX IF NOT EXISTS "Player_inField_idx" ON "Player"("inField");
CREATE INDEX IF NOT EXISTS "Player_isActive_idx" ON "Player"("isActive");
CREATE INDEX IF NOT EXISTS "Player_pga_pgaTourId_idx" ON "Player"("pga_pgaTourId");
CREATE UNIQUE INDEX IF NOT EXISTS "Player_pga_pgaTourId_key" ON "Player"("pga_pgaTourId") WHERE "pga_pgaTourId" IS NOT NULL;

-- SystemProcessRecord indexes
CREATE INDEX IF NOT EXISTS "SystemProcessRecord_createdAt_idx" ON "SystemProcessRecord"("createdAt");
CREATE INDEX IF NOT EXISTS "SystemProcessRecord_processType_idx" ON "SystemProcessRecord"("processType");
CREATE INDEX IF NOT EXISTS "SystemProcessRecord_status_idx" ON "SystemProcessRecord"("status");

-- TeamPlayer indexes and unique constraint
CREATE INDEX IF NOT EXISTS "TeamPlayer_playerId_idx" ON "TeamPlayer"("playerId");
CREATE INDEX IF NOT EXISTS "TeamPlayer_teamId_idx" ON "TeamPlayer"("teamId");
CREATE UNIQUE INDEX IF NOT EXISTS "TeamPlayer_teamId_playerId_key" ON "TeamPlayer"("teamId", "playerId");

-- TournamentPlayer indexes and unique constraint
CREATE INDEX IF NOT EXISTS "TournamentPlayer_playerId_idx" ON "TournamentPlayer"("playerId");
CREATE INDEX IF NOT EXISTS "TournamentPlayer_tournamentId_idx" ON "TournamentPlayer"("tournamentId");
CREATE UNIQUE INDEX IF NOT EXISTS "TournamentPlayer_tournamentId_playerId_key" ON "TournamentPlayer"("tournamentId", "playerId");

-- TimelineEntry indexes
CREATE INDEX IF NOT EXISTS "TimelineEntry_leagueId_tournamentId_timestamp_idx" ON "TimelineEntry"("leagueId", "tournamentId", "timestamp");
CREATE INDEX IF NOT EXISTS "TimelineEntry_teamId_tournamentId_timestamp_idx" ON "TimelineEntry"("teamId", "tournamentId", "timestamp");

-- UserOrderLog indexes
CREATE INDEX IF NOT EXISTS "UserOrderLog_userId_idx" ON "UserOrderLog"("userId");
CREATE INDEX IF NOT EXISTS "UserOrderLog_status_idx" ON "UserOrderLog"("status");

-- League indexes and unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "League_inviteCode_key" ON "League"("inviteCode") WHERE "inviteCode" IS NOT NULL;

-- LeagueTeam indexes and unique constraint
CREATE INDEX IF NOT EXISTS "LeagueTeam_leagueId_idx" ON "LeagueTeam"("leagueId");
CREATE INDEX IF NOT EXISTS "LeagueTeam_teamId_idx" ON "LeagueTeam"("teamId");
CREATE UNIQUE INDEX IF NOT EXISTS "LeagueTeam_leagueId_teamId_key" ON "LeagueTeam"("leagueId", "teamId");

-- LeagueMembership unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "LeagueMembership_userId_leagueId_key" ON "LeagueMembership"("userId", "leagueId");

-- LeagueSettings unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "LeagueSettings_leagueId_key" ON "LeagueSettings"("leagueId");

-- Team unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "Team_userId_key" ON "Team"("userId");

-- User unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- OddsCache indexes and unique constraint
CREATE INDEX IF NOT EXISTS "OddsCache_tournamentKey_bookmakers_idx" ON "OddsCache"("tournamentKey", "bookmakers");
CREATE UNIQUE INDEX IF NOT EXISTS "OddsCache_tournamentKey_bookmakers_key" ON "OddsCache"("tournamentKey", "bookmakers") WHERE "bookmakers" IS NOT NULL; 