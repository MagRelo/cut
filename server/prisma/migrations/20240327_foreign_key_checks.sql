-- Foreign Key Constraint Checks
-- This script checks for data conflicts before adding foreign key constraints
-- No changes will be made to the database

WITH conflict_checks AS (
    -- Check League commissionerId references
    SELECT 'League commissionerId conflicts' as check_name,
           COUNT(*) as conflict_count
    FROM "League" l
    LEFT JOIN "User" u ON l."commissionerId" = u.id
    WHERE u.id IS NULL

    UNION ALL

    -- Check LeagueMembership userId references
    SELECT 'LeagueMembership userId conflicts' as check_name,
           COUNT(*) as conflict_count
    FROM "LeagueMembership" lm
    LEFT JOIN "User" u ON lm."userId" = u.id
    WHERE u.id IS NULL

    UNION ALL

    -- Check LeagueMembership leagueId references
    SELECT 'LeagueMembership leagueId conflicts' as check_name,
           COUNT(*) as conflict_count
    FROM "LeagueMembership" lm
    LEFT JOIN "League" l ON lm."leagueId" = l.id
    WHERE l.id IS NULL

    UNION ALL

    -- Check LeagueSettings leagueId references
    SELECT 'LeagueSettings leagueId conflicts' as check_name,
           COUNT(*) as conflict_count
    FROM "LeagueSettings" ls
    LEFT JOIN "League" l ON ls."leagueId" = l.id
    WHERE l.id IS NULL

    UNION ALL

    -- Check LeagueTeam leagueId references
    SELECT 'LeagueTeam leagueId conflicts' as check_name,
           COUNT(*) as conflict_count
    FROM "LeagueTeam" lt
    LEFT JOIN "League" l ON lt."leagueId" = l.id
    WHERE l.id IS NULL

    UNION ALL

    -- Check LeagueTeam teamId references
    SELECT 'LeagueTeam teamId conflicts' as check_name,
           COUNT(*) as conflict_count
    FROM "LeagueTeam" lt
    LEFT JOIN "Team" t ON lt."teamId" = t.id
    WHERE t.id IS NULL

    UNION ALL

    -- Check Team userId references
    SELECT 'Team userId conflicts' as check_name,
           COUNT(*) as conflict_count
    FROM "Team" t
    LEFT JOIN "User" u ON t."userId" = u.id
    WHERE u.id IS NULL

    UNION ALL

    -- Check TeamPlayer playerId references
    SELECT 'TeamPlayer playerId conflicts' as check_name,
           COUNT(*) as conflict_count
    FROM "TeamPlayer" tp
    LEFT JOIN "Player" p ON tp."playerId" = p.id
    WHERE p.id IS NULL

    UNION ALL

    -- Check TeamPlayer teamId references
    SELECT 'TeamPlayer teamId conflicts' as check_name,
           COUNT(*) as conflict_count
    FROM "TeamPlayer" tp
    LEFT JOIN "Team" t ON tp."teamId" = t.id
    WHERE t.id IS NULL

    UNION ALL

    -- Check TimelineEntry leagueId references
    SELECT 'TimelineEntry leagueId conflicts' as check_name,
           COUNT(*) as conflict_count
    FROM "TimelineEntry" te
    LEFT JOIN "League" l ON te."leagueId" = l.id
    WHERE l.id IS NULL

    UNION ALL

    -- Check TimelineEntry teamId references
    SELECT 'TimelineEntry teamId conflicts' as check_name,
           COUNT(*) as conflict_count
    FROM "TimelineEntry" te
    LEFT JOIN "Team" t ON te."teamId" = t.id
    WHERE t.id IS NULL

    UNION ALL

    -- Check TimelineEntry tournamentId references
    SELECT 'TimelineEntry tournamentId conflicts' as check_name,
           COUNT(*) as conflict_count
    FROM "TimelineEntry" te
    LEFT JOIN "Tournament" t ON te."tournamentId" = t.id
    WHERE t.id IS NULL

    UNION ALL

    -- Check TournamentPlayer playerId references
    SELECT 'TournamentPlayer playerId conflicts' as check_name,
           COUNT(*) as conflict_count
    FROM "TournamentPlayer" tp
    LEFT JOIN "Player" p ON tp."playerId" = p.id
    WHERE p.id IS NULL

    UNION ALL

    -- Check TournamentPlayer tournamentId references
    SELECT 'TournamentPlayer tournamentId conflicts' as check_name,
           COUNT(*) as conflict_count
    FROM "TournamentPlayer" tp
    LEFT JOIN "Tournament" t ON tp."tournamentId" = t.id
    WHERE t.id IS NULL

    UNION ALL

    -- Check UserOrderLog userId references
    SELECT 'UserOrderLog userId conflicts' as check_name,
           COUNT(*) as conflict_count
    FROM "UserOrderLog" uol
    LEFT JOIN "User" u ON uol."userId" = u.id
    WHERE u.id IS NULL
)
SELECT 
    check_name,
    conflict_count,
    CASE 
        WHEN conflict_count > 0 THEN '❌ Conflicts found'
        ELSE '✅ No conflicts'
    END as status
FROM conflict_checks
ORDER BY conflict_count DESC, check_name; 