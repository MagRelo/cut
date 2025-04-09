import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getPgaLeaderboard } from '../src/lib/pgaLeaderboard';
import { prepareTournamentData } from '../src/controllers/tournamentController';
import { refreshPlayers } from '../src/lib/playerRefresh';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting database seeding...');

    // Create test users
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

    // Create a test league
    console.log('Creating test league...');
    const league = await prisma.league.create({
      data: {
        name: 'Test League',
        description: 'A test league for development',
        commissioner: {
          connect: { id: users[0].id },
        },
        settings: {
          create: {
            rosterSize: 8,
            weeklyStarters: 4,
            scoringType: 'STABLEFORD',
          },
        },
      },
    });

    // Add all users as league members
    console.log('Adding league memberships...');
    await Promise.all(
      users.map((user) =>
        prisma.leagueMembership.create({
          data: {
            user: { connect: { id: user.id } },
            league: { connect: { id: league.id } },
            role: user.id === users[0].id ? 'COMMISSIONER' : 'MEMBER',
          },
        })
      )
    );

    // Create a team for each user in the league
    console.log('Creating teams...');
    await Promise.all(
      users.map((user) =>
        prisma.team.create({
          data: {
            name: `${user.name}'s Team`,
            leagueId: league.id,
            userId: user.id,
          } as any, // TODO: Fix type issue with proper Prisma types
        })
      )
    );

    // Refresh PGA Tour players
    console.log('Refreshing PGA Tour players...');
    const players = await refreshPlayers();

    // Create current tournament
    console.log('Seeding current tournament data...');
    const leaderboardData = await getPgaLeaderboard();
    const tournament = await prisma.tournament.create({
      data: prepareTournamentData(leaderboardData),
    });

    console.log('Seed data created successfully:');
    console.log(
      'Users:',
      users.map((u) => ({ id: u.id, email: u.email }))
    );
    console.log('League:', { id: league.id, name: league.name });
    console.log('Players refreshed:', players.count);
    console.log('Tournament created:', tournament.name);
  } catch (error) {
    console.error('Error seeding database:', error);
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
