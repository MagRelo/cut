-- Add Foreign Key Constraints
-- This migration adds all foreign key constraints that were verified to have no conflicts
-- Each constraint is wrapped in a DO block to handle errors gracefully

-- League foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'League_commissionerId_fkey'
    ) THEN
        ALTER TABLE "League"
            ADD CONSTRAINT "League_commissionerId_fkey"
            FOREIGN KEY ("commissionerId")
            REFERENCES "User"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

-- LeagueMembership foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LeagueMembership_userId_fkey'
    ) THEN
        ALTER TABLE "LeagueMembership"
            ADD CONSTRAINT "LeagueMembership_userId_fkey"
            FOREIGN KEY ("userId")
            REFERENCES "User"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LeagueMembership_leagueId_fkey'
    ) THEN
        ALTER TABLE "LeagueMembership"
            ADD CONSTRAINT "LeagueMembership_leagueId_fkey"
            FOREIGN KEY ("leagueId")
            REFERENCES "League"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

-- LeagueSettings foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LeagueSettings_leagueId_fkey'
    ) THEN
        ALTER TABLE "LeagueSettings"
            ADD CONSTRAINT "LeagueSettings_leagueId_fkey"
            FOREIGN KEY ("leagueId")
            REFERENCES "League"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

-- LeagueTeam foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LeagueTeam_leagueId_fkey'
    ) THEN
        ALTER TABLE "LeagueTeam"
            ADD CONSTRAINT "LeagueTeam_leagueId_fkey"
            FOREIGN KEY ("leagueId")
            REFERENCES "League"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LeagueTeam_teamId_fkey'
    ) THEN
        ALTER TABLE "LeagueTeam"
            ADD CONSTRAINT "LeagueTeam_teamId_fkey"
            FOREIGN KEY ("teamId")
            REFERENCES "Team"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

-- Team foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Team_userId_fkey'
    ) THEN
        ALTER TABLE "Team"
            ADD CONSTRAINT "Team_userId_fkey"
            FOREIGN KEY ("userId")
            REFERENCES "User"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

-- TeamPlayer foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TeamPlayer_playerId_fkey'
    ) THEN
        ALTER TABLE "TeamPlayer"
            ADD CONSTRAINT "TeamPlayer_playerId_fkey"
            FOREIGN KEY ("playerId")
            REFERENCES "Player"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TeamPlayer_teamId_fkey'
    ) THEN
        ALTER TABLE "TeamPlayer"
            ADD CONSTRAINT "TeamPlayer_teamId_fkey"
            FOREIGN KEY ("teamId")
            REFERENCES "Team"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

-- TimelineEntry foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TimelineEntry_leagueId_fkey'
    ) THEN
        ALTER TABLE "TimelineEntry"
            ADD CONSTRAINT "TimelineEntry_leagueId_fkey"
            FOREIGN KEY ("leagueId")
            REFERENCES "League"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TimelineEntry_teamId_fkey'
    ) THEN
        ALTER TABLE "TimelineEntry"
            ADD CONSTRAINT "TimelineEntry_teamId_fkey"
            FOREIGN KEY ("teamId")
            REFERENCES "Team"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TimelineEntry_tournamentId_fkey'
    ) THEN
        ALTER TABLE "TimelineEntry"
            ADD CONSTRAINT "TimelineEntry_tournamentId_fkey"
            FOREIGN KEY ("tournamentId")
            REFERENCES "Tournament"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

-- TournamentPlayer foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TournamentPlayer_playerId_fkey'
    ) THEN
        ALTER TABLE "TournamentPlayer"
            ADD CONSTRAINT "TournamentPlayer_playerId_fkey"
            FOREIGN KEY ("playerId")
            REFERENCES "Player"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TournamentPlayer_tournamentId_fkey'
    ) THEN
        ALTER TABLE "TournamentPlayer"
            ADD CONSTRAINT "TournamentPlayer_tournamentId_fkey"
            FOREIGN KEY ("tournamentId")
            REFERENCES "Tournament"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

-- UserOrderLog foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserOrderLog_userId_fkey'
    ) THEN
        ALTER TABLE "UserOrderLog"
            ADD CONSTRAINT "UserOrderLog_userId_fkey"
            FOREIGN KEY ("userId")
            REFERENCES "User"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$; 