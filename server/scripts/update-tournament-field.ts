import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PlayerCard {
  identifier: string;
  firstName: string;
  lastName: string;
  amateur: boolean;
  champion: boolean;
}

interface TournamentData {
  data: Array<{
    id: string;
    name: string;
    resultset: {
      cards: PlayerCard[];
    };
  }>;
}

async function updateTournamentField() {
  try {
    // 1. Read the JSON file
    const jsonPath = path.join(__dirname, '../../stash/us-open.json');
    const jsonData = JSON.parse(
      fs.readFileSync(jsonPath, 'utf-8')
    ) as TournamentData;

    // 2. Extract all player identifiers from the JSON
    const playerIdentifiers =
      jsonData.data
        .find((d) => d.name === 'all_player')
        ?.resultset.cards.map((card) => card.identifier) || [];

    console.log(
      `Found ${playerIdentifiers.length} players in the tournament field`
    );

    // 3. Set all players' inField to false first
    await prisma.player.updateMany({
      where: {
        inField: true,
      },
      data: {
        inField: false,
      },
    });

    console.log('Reset all players inField status to false');

    // 4. Update players that are in the field
    const updateResult = await prisma.player.updateMany({
      where: {
        pga_pgaTourId: {
          in: playerIdentifiers,
        },
      },
      data: {
        inField: true,
      },
    });

    console.log(`Updated ${updateResult.count} players to inField = true`);

    // 5. Log any players that weren't found in our database
    const foundPlayers = await prisma.player.findMany({
      where: {
        pga_pgaTourId: {
          in: playerIdentifiers,
        },
      },
      select: {
        pga_pgaTourId: true,
      },
    });

    const foundIds = new Set(foundPlayers.map((p) => p.pga_pgaTourId));
    const missingPlayers = playerIdentifiers.filter((id) => !foundIds.has(id));

    if (missingPlayers.length > 0) {
      console.log('\nPlayers not found in database:');
      missingPlayers.forEach((id) => console.log(`- ${id}`));
    }
  } catch (error) {
    console.error('Error updating tournament field:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTournamentField();
