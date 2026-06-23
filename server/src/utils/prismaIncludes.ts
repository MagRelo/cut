// Reusable Prisma include fragments for consistent queries

/**
 * Lineup picks with event participant and participant profile data.
 */
export const lineupPicksInclude = {
  picks: {
    include: {
      eventParticipant: {
        include: {
          participant: true,
        },
      },
    },
  },
} as const;

/**
 * Standard include for fetching contest lineups with full pick data.
 */
export const contestLineupsInclude = {
  include: {
    user: true,
    lineup: {
      include: lineupPicksInclude,
    },
  },
} as const;

/**
 * Contest lineups without pick joins (lighter payload for OPEN contests).
 */
export const contestLineupsIncludeWithoutPlayers = {
  include: {
    user: {
      select: {
        id: true,
        name: true,
        settings: true,
      },
    },
    lineup: true,
  },
} as const;
