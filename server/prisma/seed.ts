import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

    console.log('Seed data created successfully:');
    console.log(
      'Users:',
      users.map((u) => ({ id: u.id, email: u.email }))
    );
    console.log('League:', { id: league.id, name: league.name });
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
