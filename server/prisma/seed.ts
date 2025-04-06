import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { scrapePGATourData } from '../src/lib/leaderboard';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting database seeding...');

    // 1. Get both the processed and raw PGA Tour data
    console.log('Fetching PGA Tour data...');
    const [pgaData] = await Promise.all([scrapePGATourData()]);
    const realPlayers = pgaData.players.slice(0, 24); // Get top 24 players to distribute among teams

    // 2. Create 3 users with hashed passwords
    console.log('Creating users...');
    const testPassword = 'asdfasdf';
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

    // 3. Create 1 league
    console.log('Creating league...');
    const league = await prisma.league.upsert({
      where: { id: 'seed-league' },
      update: {},
      create: {
        id: 'seed-league',
        name: 'Seed League',
        maxTeams: 8,
        commissioner: {
          connect: { id: users[0].id }, // First user is commissioner
        },
        members: {
          create: users.map((user) => ({
            userId: user.id,
            role: user.id === users[0].id ? 'COMMISSIONER' : 'MEMBER',
          })),
        },
      },
    });

    // 4. Create 3 teams (one for each user)
    console.log('Creating teams...');
    const teams = await Promise.all(
      users.map(async (user, index) => {
        const teamPlayers = realPlayers.slice(index * 8, (index + 1) * 8); // Get 8 unique players for each team

        return prisma.team.create({
          data: {
            name: `${user.name}'s Team`,
            league: {
              connect: { id: league.id },
            },
            users: {
              connect: { id: user.id },
            },
            players: {
              create: teamPlayers.map((player, playerIndex) => {
                const roundData = {
                  strokes: Math.floor(Math.random() * 5) - 2,
                  putts: Math.floor(Math.random() * 30) + 25,
                  fairwaysHit: Math.floor(Math.random() * 14) + 7,
                  greensInRegulation: Math.floor(Math.random() * 18) + 9,
                };

                return {
                  name: player.playerName,
                  isActive: playerIndex < 4, // First 4 players are active
                  leaderboardPosition:
                    player.position || String(playerIndex + 1),
                  pgaTourId: player.pgaTourId,
                  r1: roundData,
                  r2: roundData,
                  r3: roundData,
                  r4: roundData,
                  total: Math.floor(Math.random() * 20) - 10,
                  cut: null,
                  bonus: playerIndex < 3 ? (3 - playerIndex) * 5 : null, // Bonus points for top 3 positions
                };
              }),
            },
          },
        });
      })
    );

    console.log('Seed data created successfully:');
    console.log(
      'Users:',
      users.map((u) => ({ id: u.id, email: u.email }))
    );
    console.log('League:', { id: league.id, name: league.name });
    console.log(
      'Teams:',
      teams.map((t) => ({ id: t.id, name: t.name }))
    );
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
