import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
}

const prisma =
  global.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
    // Configure connection limits through environment variables
    // These will be picked up by Prisma's connection URL
    datasourceUrl: `${process.env.DATABASE_URL}?connection_limit=6&pool_timeout=30`,
  });

if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

export { prisma };

// Handle cleanup on app termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
