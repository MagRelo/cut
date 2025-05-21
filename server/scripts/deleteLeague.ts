import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

async function deleteLeague(leagueId: string) {
  try {
    // First, verify the league exists
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) {
      console.error(`League with ID ${leagueId} not found`);
      return;
    }

    // Delete all related records in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete LeagueTeam relationships
      await tx.leagueTeam.deleteMany({
        where: { leagueId },
      });

      // 2. Delete League Memberships
      await tx.leagueMembership.deleteMany({
        where: { leagueId },
      });

      // 3. Delete Timeline Entries related to the league
      await tx.timelineEntry.deleteMany({
        where: { leagueId },
      });

      // 4. Delete the League itself
      await tx.league.delete({
        where: { id: leagueId },
      });
    });

    console.log(`Successfully deleted league ${leagueId} and associated data`);
  } catch (error) {
    console.error('Error deleting league:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Handle command line arguments
if (import.meta.url === `file://${process.argv[1]}`) {
  const leagueId = process.argv[2];

  if (!leagueId) {
    console.error('Please provide a league ID as an argument');
    console.error('Usage: npm run delete-league <leagueId>');
    process.exit(1);
  }

  deleteLeague(leagueId)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to delete league:', error);
      process.exit(1);
    });
}

export { deleteLeague };
