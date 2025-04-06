import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Generate unique test data for each test run
function generateTestData() {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  return {
    user: {
      email: `test.user.${timestamp}.${randomString}@example.com`,
      name: 'Test User',
      password: 'hashedPassword',
      emailVerified: true,
    },
    league: {
      name: `Test League ${timestamp}`,
      description: 'Test League Description',
      isPrivate: false,
      maxTeams: 8,
    },
    team: {
      name: `Test Team ${timestamp}`,
    },
    player: {
      name: `Test Player ${timestamp}`,
      isActive: false,
      leaderboardPosition: 'GOLFER',
    },
  };
}

// We'll store the generated data here for tests to use
export let testUser: any;
export let testLeague: any;
export let testTeam: any;
export let testPlayer: any;

async function cleanup() {
  try {
    // Delete test data in the correct order (respecting foreign key constraints)
    await prisma.$transaction([
      // First delete players (they depend on teams)
      prisma.player.deleteMany({
        where: {
          OR: [
            { team: { league: { name: { startsWith: 'Test League' } } } },
            { name: { startsWith: 'Test Player' } },
          ],
        },
      }),
      // Then delete teams (they depend on leagues)
      prisma.team.deleteMany({
        where: {
          OR: [
            { league: { name: { startsWith: 'Test League' } } },
            { name: { startsWith: 'Test Team' } },
          ],
        },
      }),
      // Then delete league memberships (they depend on leagues)
      prisma.leagueMembership.deleteMany({
        where: {
          OR: [
            { league: { name: { startsWith: 'Test League' } } },
            { user: { email: { contains: 'test.user' } } },
          ],
        },
      }),
      // Then delete league settings (they depend on leagues)
      prisma.leagueSettings.deleteMany({
        where: {
          league: { name: { startsWith: 'Test League' } },
        },
      }),
      // Finally delete leagues
      prisma.league.deleteMany({
        where: {
          name: { startsWith: 'Test League' },
        },
      }),
      // And clean up test users
      prisma.user.deleteMany({
        where: {
          email: { contains: 'test.user' },
        },
      }),
    ]);
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    throw error;
  }
}

// Clean up before and after all tests
beforeAll(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

// Set up fresh test data before each test
beforeEach(async () => {
  try {
    // Generate fresh test data for this run
    const testData = generateTestData();

    // Create test data in a transaction
    await prisma.$transaction(async (tx) => {
      // Create user first
      testUser = await tx.user.create({
        data: testData.user,
      });

      // Create league with settings and membership
      testLeague = await tx.league.create({
        data: {
          ...testData.league,
          commissionerId: testUser.id,
          settings: { create: {} },
          members: {
            create: {
              userId: testUser.id,
              role: 'COMMISSIONER',
            },
          },
        },
        include: {
          settings: true,
          members: true,
        },
      });

      // Create team
      testTeam = await tx.team.create({
        data: {
          ...testData.team,
          leagueId: testLeague.id,
          users: {
            connect: { id: testUser.id },
          },
        },
        include: {
          users: true,
        },
      });

      // Create player
      testPlayer = await tx.player.create({
        data: {
          ...testData.player,
          teamId: testTeam.id,
        },
      });
    });
  } catch (error) {
    console.error('Error setting up test data:', error);
    throw error;
  }
});
