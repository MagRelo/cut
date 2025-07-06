import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
}

// Helper to safely append connection parameters
function appendConnectionParams(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  // More conservative settings for remote databases
  return `${url}${separator}connection_limit=3&pool_timeout=20&connect_timeout=10`;
}

const prisma =
  global.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
    // Configure connection limits through environment variables
    datasourceUrl: appendConnectionParams(process.env.DATABASE_URL || ''),
  });

if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

export { prisma };

// Handle cleanup on app termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
