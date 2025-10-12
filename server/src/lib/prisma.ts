import { PrismaClient } from "@prisma/client";

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
}

// Helper to safely append connection parameters
function appendConnectionParams(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  // Hardcoded connection limits for development stability
  return `${url}${separator}connection_limit=5&pool_timeout=20&connect_timeout=10&socket_timeout=10`;
}

let prismaInstance: PrismaClient | undefined;

export function getPrisma() {
  if (!prismaInstance) {
    prismaInstance =
      global.prisma ||
      new PrismaClient({
        datasourceUrl: appendConnectionParams(process.env.DATABASE_URL || ""),
      });

    if (process.env.NODE_ENV === "development") {
      global.prisma = prismaInstance;
    }
  }
  return prismaInstance;
}

// Graceful shutdown handler
async function gracefulShutdown() {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = undefined;
    global.prisma = undefined;
  }
}

// Handle cleanup on app termination
process.on("beforeExit", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Export a proxy that will lazy initialize the client
export const prisma = new Proxy({} as PrismaClient, {
  get: (_target, prop) => {
    const client = getPrisma();
    return client[prop as keyof PrismaClient];
  },
});

// Export cleanup function for manual use
export { gracefulShutdown };
