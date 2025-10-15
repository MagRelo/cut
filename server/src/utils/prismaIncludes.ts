// Reusable Prisma include fragments for consistent queries

/**
 * Standard include for fetching tournament player data
 * Use when querying TournamentLineupPlayer -> TournamentPlayer
 */
export const tournamentPlayerInclude = {
  include: {
    player: true,
  },
} as const;

/**
 * Standard include for fetching lineup players with full tournament data
 * Use when querying TournamentLineup -> TournamentLineupPlayer -> TournamentPlayer -> Player
 */
export const lineupPlayersInclude = {
  players: {
    include: {
      tournamentPlayer: {
        include: {
          player: true,
        },
      },
    },
  },
} as const;

/**
 * Standard include for fetching contest lineups with full player data
 * Use when querying Contest -> ContestLineup -> TournamentLineup -> Players
 */
export const contestLineupsInclude = {
  include: {
    user: true,
    tournamentLineup: {
      include: {
        players: {
          include: {
            tournamentPlayer: {
              include: {
                player: true,
              },
            },
          },
        },
      },
    },
  },
} as const;
