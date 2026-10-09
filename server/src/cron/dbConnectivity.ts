const DB_CONNECTIVITY =
  /P1001|P1017|P2024|P2037|Timed out fetching a new connection|Can't reach database server|Operations timed out|Server has closed the connection|connection pool|PrismaClientInitializationError/i;

function errorText(error: unknown, depth = 0): string {
  if (depth > 5 || error == null) {
    return "";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    const extra = error as { code?: unknown; cause?: unknown };
    return [error.name, extra.code, error.message, errorText(extra.cause, depth + 1)]
      .filter((part) => part != null && part !== "")
      .join(" ");
  }
  return String(error);
}

/** Thrown when Postgres itself is unreachable. Per-contest results are not this. */
export function isDbConnectivityError(error: unknown): boolean {
  return DB_CONNECTIVITY.test(errorText(error));
}

/**
 * Run a cron task again after a database connectivity failure.
 * A second failure propagates so the pipeline can page.
 */
export async function retryOnceOnDbConnectivity<T>(
  task: () => Promise<T>,
  wait: () => Promise<void>,
): Promise<T> {
  try {
    return await task();
  } catch (error) {
    if (!isDbConnectivityError(error)) {
      throw error;
    }
    await wait();
    return await task();
  }
}
