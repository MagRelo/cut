import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

async function deleteTeam(teamId: string) {
  try {
    // First, get the team to find the user ID
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { userId: true },
    });

    if (!team) {
      console.error(`Team with ID ${teamId} not found`);
      return;
    }

    // Delete all related records in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete TeamPlayer relationships
      await tx.teamPlayer.deleteMany({
        where: { teamId },
      });

      // 2. Delete LeagueTeam relationships
      await tx.leagueTeam.deleteMany({
        where: { teamId },
      });

      // 3. Delete TimelineEntry relationships
      await tx.timelineEntry.deleteMany({
        where: { teamId },
      });

      // 4. Delete League Memberships for the user
      await tx.leagueMembership.deleteMany({
        where: { userId: team.userId },
      });

      // 5. Delete User Order Logs
      await tx.userOrderLog.deleteMany({
        where: { userId: team.userId },
      });

      // 6. Delete the Team
      await tx.team.delete({
        where: { id: teamId },
      });

      // 7. Delete the User
      await tx.user.delete({
        where: { id: team.userId },
      });
    });

    console.log(`Successfully deleted team ${teamId} and associated data`);
  } catch (error) {
    console.error('Error deleting team:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Handle command line arguments
if (import.meta.url === `file://${process.argv[1]}`) {
  const teamId = process.argv[2];

  if (!teamId) {
    console.error('Please provide a team ID as an argument');
    console.error('Usage: npm run delete-team <teamId>');
    process.exit(1);
  }

  deleteTeam(teamId)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to delete team:', error);
      process.exit(1);
    });
}

export { deleteTeam };
