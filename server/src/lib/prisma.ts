import { PrismaClient } from "@prisma/client";

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Append Prisma connection pool params. Overridable via env (cron Pi → remote DB). */
function appendConnectionParams(url: string): string {
  const connectionLimit = parsePositiveInt(process.env.PRISMA_CONNECTION_LIMIT, 5);
  const poolTimeout = parsePositiveInt(process.env.PRISMA_POOL_TIMEOUT, 20);
  const connectTimeout = parsePositiveInt(process.env.PRISMA_CONNECT_TIMEOUT, 10);
  // Default 60s: home/Pi → managed DB RTT; 10s caused client aborts + orphaned server queries.
  const socketTimeout = parsePositiveInt(process.env.PRISMA_SOCKET_TIMEOUT, 60);

  const separator = url.includes("?") ? "&" : "?";
  return (
    `${url}${separator}` +
    `connection_limit=${connectionLimit}` +
    `&pool_timeout=${poolTimeout}` +
    `&connect_timeout=${connectTimeout}` +
    `&socket_timeout=${socketTimeout}`
  );
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
