import type { PlayerWithTournamentData, TournamentLineup } from "../types/player.js";

/**
 * Transform Pattern A: Player with tournamentPlayers include
 * Used when querying: Player.findMany({ include: { tournamentPlayers: { where: { tournamentId } } } })
 */
export function transformPlayerWithTournamentData(
  player: any,
  tournamentId: string
): PlayerWithTournamentData {
  const tournamentPlayer = player.tournamentPlayers?.[0];

  return {
    id: player.id,
    pga_pgaTourId: player.pga_pgaTourId,
    pga_imageUrl: player.pga_imageUrl,
    pga_displayName: player.pga_displayName,
    pga_firstName: player.pga_firstName,
    pga_lastName: player.pga_lastName,
    pga_shortName: player.pga_shortName,
    pga_country: player.pga_country,
    pga_countryFlag: player.pga_countryFlag,
    pga_age: player.pga_age,
    pga_owgr: player.pga_owgr,
    pga_fedex: player.pga_fedex,
    pga_performance: player.pga_performance as Record<string, unknown>,
    isActive: player.isActive,
    inField: player.inField,
    createdAt: player.createdAt,
    updatedAt: player.updatedAt,
    lastSyncedAt: player.lastSyncedAt,
    tournamentId,
        tournamentData: tournamentPlayer
      ? {
          leaderboardPosition: tournamentPlayer.leaderboardPosition,
          r1: tournamentPlayer.r1,
          r2: tournamentPlayer.r2,
          r3: tournamentPlayer.r3,
          r4: tournamentPlayer.r4,
          rCurrent: tournamentPlayer.rCurrent,
          cut: tournamentPlayer.cut,
          bonus: tournamentPlayer.bonus,
          stableford: tournamentPlayer.stableford,
          total: tournamentPlayer.total,
          leaderboardTotal: tournamentPlayer.leaderboardTotal,
        }
      : {
          leaderboardPosition: null,
          r1: null,
          r2: null,
          r3: null,
          r4: null,
          rCurrent: null,
          cut: null,
          bonus: null,
          stableford: null,
          total: null,
          leaderboardTotal: null,
        },
  };
}

/**
 * Transform Pattern B: TournamentLineupPlayer with nested tournamentPlayer.player
 * Used when querying: TournamentLineup.findMany({ include: { players: { include: { tournamentPlayer: { include: { player: true } } } } } })
 */
export function transformLineupPlayer(
  lineupPlayer: any,
  tournamentId: string
): PlayerWithTournamentData {
  const player = lineupPlayer.tournamentPlayer.player;
  const tournamentPlayer = lineupPlayer.tournamentPlayer;

  return {
    id: player.id,
    pga_pgaTourId: player.pga_pgaTourId,
    pga_imageUrl: player.pga_imageUrl,
    pga_displayName: player.pga_displayName,
    pga_firstName: player.pga_firstName,
    pga_lastName: player.pga_lastName,
    pga_shortName: player.pga_shortName,
    pga_country: player.pga_country,
    pga_countryFlag: player.pga_countryFlag,
    pga_age: player.pga_age,
    pga_owgr: player.pga_owgr,
    pga_fedex: player.pga_fedex,
    pga_performance: player.pga_performance as Record<string, unknown>,
    isActive: player.isActive,
    inField: player.inField,
    createdAt: player.createdAt,
    updatedAt: player.updatedAt,
    lastSyncedAt: player.lastSyncedAt,
    tournamentId,
    tournamentData: {
      leaderboardPosition: tournamentPlayer.leaderboardPosition,
      r1: tournamentPlayer.r1,
      r2: tournamentPlayer.r2,
      r3: tournamentPlayer.r3,
      r4: tournamentPlayer.r4,
      rCurrent: tournamentPlayer.rCurrent,
      cut: tournamentPlayer.cut,
      bonus: tournamentPlayer.bonus,
      stableford: tournamentPlayer.stableford,
      total: tournamentPlayer.total,
      leaderboardTotal: tournamentPlayer.leaderboardTotal,
    },
  };
}

/**
 * Transform a tournament lineup with nested player data
 */
export function transformTournamentLineup(lineup: any, tournamentId: string): TournamentLineup {
  return {
    id: lineup.id,
    name: lineup.name,
    players: lineup.players.map((lineupPlayer: any) =>
      transformLineupPlayer(lineupPlayer, tournamentId)
    ),
  };
}
