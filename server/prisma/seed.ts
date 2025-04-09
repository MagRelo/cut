import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getPgaLeaderboard } from '../src/lib/pgaLeaderboard';
import { prepareTournamentData } from '../src/controllers/tournamentController';
import { refreshPlayers } from '../src/lib/playerRefresh';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting database seeding...');

    console.log('Creating users...');
    const testPassword = 'partytime';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const users = await Promise.all([
      prisma.user.upsert({
        where: { email: 'user1@example.com' },
        update: {},
        create: {
          email: 'user1@example.com',
          password: hashedPassword,
          name: 'User One',
          emailVerified: true,
        },
      }),
      prisma.user.upsert({
        where: { email: 'user2@example.com' },
        update: {},
        create: {
          email: 'user2@example.com',
          password: hashedPassword,
          name: 'User Two',
          emailVerified: true,
        },
      }),
      prisma.user.upsert({
        where: { email: 'user3@example.com' },
        update: {},
        create: {
          email: 'user3@example.com',
          password: hashedPassword,
          name: 'User Three',
          emailVerified: true,
        },
      }),
    ]);

    console.log('Refreshing PGA Tour players...');
    const players = await refreshPlayers();

    console.log('Seeding current tournament data...');
    // Fetch current tournament data from PGA Tour
    const leaderboardData = await getPgaLeaderboard();

    // Create tournament record
    const tournament = await prisma.tournament.create({
      data: prepareTournamentData(leaderboardData),
    });

    console.log('Seed data created successfully:');
    console.log(
      'Users:',
      users.map((u) => ({ id: u.id, email: u.email }))
    );
    console.log('Players refreshed:', players.count);
    console.log('Tournament:', { id: tournament.id, name: tournament.name });
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
