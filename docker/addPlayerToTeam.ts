import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

async function addPlayerToTeam(teamId: string, playerId: string) {
  try {
    // First, verify the team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true, userId: true },
    });

    if (!team) {
      console.error(`Team with ID ${teamId} not found`);
      return;
    }

    // Verify the player exists
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        pga_displayName: true,
        pga_firstName: true,
        pga_lastName: true,
      },
    });

    if (!player) {
      console.error(`Player with ID ${playerId} not found`);
      return;
    }

    // Check if player is already on the team
    const existingTeamPlayer = await prisma.teamPlayer.findUnique({
      where: {
        teamId_playerId: {
          teamId,
          playerId,
        },
      },
    });

    if (existingTeamPlayer) {
      console.log(
        `Player ${
          player.pga_displayName ||
          `${player.pga_firstName} ${player.pga_lastName}`
        } is already on team ${team.name}`
      );
      return;
    }

    // Add player to team
    const teamPlayer = await prisma.teamPlayer.create({
      data: {
        id: `${teamId}_${playerId}`, // Create a unique ID
        teamId,
        playerId,
        active: true,
        updatedAt: new Date(),
      },
      include: {
        Player: {
          select: {
            pga_displayName: true,
            pga_firstName: true,
            pga_lastName: true,
          },
        },
        Team: {
          select: {
            name: true,
          },
        },
      },
    });

    const playerName =
      teamPlayer.Player.pga_displayName ||
      `${teamPlayer.Player.pga_firstName} ${teamPlayer.Player.pga_lastName}`;

    console.log(
      `Successfully added player ${playerName} to team ${teamPlayer.Team.name}`
    );
    console.log(`TeamPlayer ID: ${teamPlayer.id}`);
  } catch (error) {
    console.error('Error adding player to team:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Handle command line arguments
if (import.meta.url === `file://${process.argv[1]}`) {
  const teamId = process.argv[2];
  const playerId = process.argv[3];

  if (!teamId || !playerId) {
    console.error('Please provide both team ID and player ID as arguments');
    console.error('Usage: npm run add-player-to-team <teamId> <playerId>');
    process.exit(1);
  }

  addPlayerToTeam(teamId, playerId)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to add player to team:', error);
      process.exit(1);
    });
}

export { addPlayerToTeam };
