import { PrismaClient } from '@prisma/client';
import { fetchPGATourPlayers } from './pgaPlayers.js';
import { getActivePlayers } from './pgaField.js';

const prisma = new PrismaClient();

/**
 * Refreshes the players in the database with current PGA Tour data
 * @param currentTournamentId - The ID of the current tournament to check field status
 * @returns Promise containing the created players
 */
export async function refreshPlayers(currentTournamentId: string = 'R2025014') {
  try {
    // Delete all existing players
    await prisma.player.deleteMany();

    // Get current tournament field data first
    const { players: fieldPlayers } = await getActivePlayers(
      currentTournamentId
    );

    // Create a Set of player IDs who are in the field for quick lookup
    const inFieldPlayerIds = new Set(fieldPlayers.map((p) => p.id));

    // Fetch fresh player data from PGA Tour API
    const players = await fetchPGATourPlayers();

    // Insert new players
    const createdPlayers = await prisma.player.createMany({
      data: players.map((player) => ({
        pgaTourId: player.id,
        name: `${player.firstName} ${player.lastName}`.trim(),
        firstName: player.firstName,
        lastName: player.lastName,
        displayName: player.displayName,
        imageUrl: player.headshot || null,
        country: player.country || null,
        countryFlag: player.countryFlag || null,
        age: player.playerBio?.age || null,
        isActive: player.isActive || false,
        inField: inFieldPlayerIds.has(player.id),
      })),
    });

    return createdPlayers;
  } catch (error) {
    console.error('Error refreshing players:', error);
    throw error;
  }
}
