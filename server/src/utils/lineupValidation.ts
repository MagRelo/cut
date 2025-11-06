import crypto from "crypto";
import { prisma } from "../lib/prisma.js";

/**
 * Normalize player IDs by sorting them
 * This ensures that [A, B, C] and [C, A, B] are considered identical
 */
export function normalizePlayerSet(playerIds: string[]): string {
  return [...playerIds].sort().join(",");
}

/**
 * Generate deterministic entryId from userId and playerIds
 * Formula: entryId = hash(userId + sorted playerIds)
 *
 * This ensures:
 * - Same players for same user = same entryId
 * - Different users with same players = different entryIds
 * - EntryId can be reused across contests
 * - Contract enforces uniqueness per contest
 *
 * @param userId - The user's ID
 * @param playerIds - Array of player IDs
 * @returns Numeric string compatible with uint256
 */
export function generateEntryId(userId: string, playerIds: string[]): string {
  const normalized = normalizePlayerSet(playerIds);
  const input = `${userId}:${normalized}`;
  const hash = crypto.createHash("sha256").update(input).digest("hex");

  // Convert first 64 bits (16 hex chars) to decimal string
  // This is safe for uint256 and provides sufficient uniqueness
  const entryId = BigInt("0x" + hash.substring(0, 16)).toString();

  return entryId;
}

/**
 * Validate that lineup has minimum required players
 * @param playerIds - Array of player IDs
 * @returns true if lineup has at least 1 player
 */
export function hasMinimumPlayers(playerIds: string[]): boolean {
  return playerIds.length >= 1;
}

/**
 * Check if a lineup with this exact player set already exists for the user in a tournament
 * Used when creating or updating TournamentLineup
 *
 * @param userId - The user's ID
 * @param tournamentId - The tournament ID
 * @param playerIds - Array of player IDs to check
 * @param excludeLineupId - Optional lineup ID to exclude from check (for updates)
 * @returns true if duplicate exists
 */
export async function isDuplicateLineup(
  userId: string,
  tournamentId: string,
  playerIds: string[],
  excludeLineupId?: string
): Promise<boolean> {
  const normalized = normalizePlayerSet(playerIds);

  // Fetch all lineups for this user in this tournament
  const userLineups = await prisma.tournamentLineup.findMany({
    where: {
      userId,
      tournamentId,
    },
    include: {
      players: {
        include: {
          tournamentPlayer: true,
        },
      },
    },
  });

  // Check if any lineup has the same player set
  return userLineups.some((lineup: typeof userLineups[number]) => {
    // Skip the lineup being updated
    if (excludeLineupId && lineup.id === excludeLineupId) {
      return false;
    }

    // Extract player IDs from this lineup
    const lineupPlayerIds = lineup.players.map((p: typeof lineup.players[number]) => p.tournamentPlayer.playerId);

    // Compare normalized player sets
    return normalizePlayerSet(lineupPlayerIds) === normalized;
  });
}

/**
 * Check if user already has this player set in a contest
 * Used when adding a lineup to a contest
 *
 * @param userId - The user's ID
 * @param contestId - The contest ID
 * @param playerIds - Array of player IDs to check
 * @param excludeLineupId - Optional tournamentLineupId to exclude from check
 * @returns true if duplicate exists in this contest
 */
export async function isDuplicateInContest(
  userId: string,
  contestId: string,
  playerIds: string[],
  excludeLineupId?: string
): Promise<boolean> {
  const normalized = normalizePlayerSet(playerIds);

  // Fetch all contest lineups for this user in this contest
  const contestLineups = await prisma.contestLineup.findMany({
    where: {
      contestId,
      userId,
    },
    include: {
      tournamentLineup: {
        include: {
          players: {
            include: {
              tournamentPlayer: true,
            },
          },
        },
      },
    },
  });

  // Check if any contest lineup has the same player set
  return contestLineups.some((contestLineup: typeof contestLineups[number]) => {
    // Skip the lineup being checked (if updating)
    if (excludeLineupId && contestLineup.tournamentLineupId === excludeLineupId) {
      return false;
    }

    // Extract player IDs from this lineup
    const lineupPlayerIds = contestLineup.tournamentLineup.players.map(
      (p: typeof contestLineup.tournamentLineup.players[number]) => p.tournamentPlayer.playerId
    );

    // Compare normalized player sets
    return normalizePlayerSet(lineupPlayerIds) === normalized;
  });
}

/**
 * Get player IDs from a tournament lineup
 * Helper function to extract player IDs from a lineup
 *
 * @param tournamentLineupId - The tournament lineup ID
 * @returns Array of player IDs
 */
export async function getPlayerIdsFromLineup(tournamentLineupId: string): Promise<string[]> {
  const lineup = await prisma.tournamentLineup.findUnique({
    where: { id: tournamentLineupId },
    include: {
      players: {
        include: {
          tournamentPlayer: true,
        },
      },
    },
  });

  if (!lineup) {
    throw new Error("Lineup not found");
  }

  return lineup.players.map((p: typeof lineup.players[number]) => p.tournamentPlayer.playerId);
}
