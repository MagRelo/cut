import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://doadmin:AVNS_HKOb7koa8DviT7L0fBR@db-postgresql-nyc3-02355-may-24-backup-2-do-user-17464390-0.k.db.ondigitalocean.com:25060/defaultdb?sslmode=require',
    },
  },
});

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

async function checkFieldCount() {
  try {
    // Check database count
    const dbCount = await prisma.player.count({
      where: {
        inField: true,
      },
    });

    console.log(`Number of players in database marked as inField: ${dbCount}`);

    // Check JSON count
    const jsonPath = path.join(__dirname, '../../stash/us-open.json');
    const jsonData = JSON.parse(
      fs.readFileSync(jsonPath, 'utf-8')
    ) as TournamentData;

    const jsonPlayers =
      jsonData.data.find((d) => d.name === 'all_player')?.resultset.cards || [];

    console.log(`\nNumber of players in JSON file: ${jsonPlayers.length}`);

    // Get all players from database that are in field
    const dbPlayers = await prisma.player.findMany({
      where: {
        inField: true,
      },
      select: {
        pga_pgaTourId: true,
        pga_displayName: true,
        pga_firstName: true,
        pga_lastName: true,
      },
    });

    // Find players in JSON but not in database by ID
    const dbPlayerIds = new Set(dbPlayers.map((p) => p.pga_pgaTourId));
    const missingPlayers = jsonPlayers.filter(
      (player) => !dbPlayerIds.has(player.identifier)
    );

    console.log(
      `\nNumber of players in JSON but not found by ID: ${missingPlayers.length}`
    );
    console.log('\nInvestigating ID mismatches:');

    for (const player of missingPlayers) {
      // Search for player by name in database
      const dbPlayer = await prisma.player.findFirst({
        where: {
          OR: [
            {
              pga_firstName: {
                equals: player.firstName.trim(),
                mode: 'insensitive',
              },
              pga_lastName: {
                equals: player.lastName.trim(),
                mode: 'insensitive',
              },
            },
            {
              pga_displayName: {
                contains: `${player.firstName.trim()} ${player.lastName.trim()}`,
                mode: 'insensitive',
              },
            },
          ],
        },
        select: {
          pga_pgaTourId: true,
          pga_displayName: true,
          pga_firstName: true,
          pga_lastName: true,
        },
      });

      if (dbPlayer) {
        console.log(
          `\nFound match for ${player.firstName} ${player.lastName}:`
        );
        console.log(`- JSON ID: ${player.identifier}`);
        console.log(`- DB ID: ${dbPlayer.pga_pgaTourId}`);
        console.log(
          `- DB Name: ${
            dbPlayer.pga_displayName ||
            `${dbPlayer.pga_firstName} ${dbPlayer.pga_lastName}`
          }`
        );
      } else {
        console.log(
          `\nNo match found for ${player.firstName} ${player.lastName} (ID: ${player.identifier})`
        );
      }
    }
  } catch (error) {
    console.error('Error checking field count:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFieldCount();
