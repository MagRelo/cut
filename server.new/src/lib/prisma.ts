import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
}

// Helper to safely append connection parameters
function appendConnectionParams(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}connection_limit=6&pool_timeout=30`;
}

let prismaInstance: PrismaClient | undefined;

export function getPrisma() {
  if (!prismaInstance) {
    console.log('Initializing Prisma client');
    prismaInstance =
      global.prisma ||
      new PrismaClient({
        log: ['error', 'warn'],
        datasourceUrl: appendConnectionParams(process.env.DATABASE_URL || ''),
      });

    if (process.env.NODE_ENV === 'development') {
      global.prisma = prismaInstance;
    }
  }
  return prismaInstance;
}

// Handle cleanup on app termination
process.on('beforeExit', async () => {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
  }
});

// Export a proxy that will lazy initialize the client
export const prisma = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    const client = getPrisma();
    return client[prop as keyof PrismaClient];
  },
});
