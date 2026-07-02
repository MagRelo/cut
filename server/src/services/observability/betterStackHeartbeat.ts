/**
 * Better Stack heartbeat reporting for the cron pipeline.
 *
 * Success: GET {BETTERSTACK_HEARTBEAT_URL}
 * Failure:  POST {BETTERSTACK_HEARTBEAT_URL}/{exitCode} with error output in the body
 *           (or GET .../fail when no output is provided)
 *
 * @see https://betterstack.com/docs/uptime/cron-and-heartbeat-monitor/
 */

const HEARTBEAT_TIMEOUT_MS = 10_000;

function getHeartbeatBaseUrl(): string | null {
  const raw = process.env.BETTERSTACK_HEARTBEAT_URL?.trim();
  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts.at(-1);
    if (last && (last === "fail" || /^\d+$/.test(last))) {
      parts.pop();
    }
    url.pathname = `/${parts.join("/")}`;
    return url.toString().replace(/\/$/, "");
  } catch {
    console.warn("[CRON] BETTERSTACK_HEARTBEAT_URL is not a valid URL");
    return null;
  }
}

export function formatErrorForHeartbeat(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}

async function sendHeartbeatRequest(
  url: string,
  options?: { method?: "GET" | "POST"; body?: string },
): Promise<void> {
  const method = options?.method ?? "GET";

  try {
    const init: RequestInit = {
      method,
      signal: AbortSignal.timeout(HEARTBEAT_TIMEOUT_MS),
    };
    if (options?.body !== undefined) {
      init.body = options.body;
    }
    const response = await fetch(url, init);
    if (!response.ok) {
      console.warn(`[CRON] Better Stack heartbeat request failed: HTTP ${response.status} (${url})`);
    }
  } catch (error) {
    console.warn("[CRON] Better Stack heartbeat request failed:", error);
  }
}

/** Ping after a fully successful pipeline run. */
export async function reportBetterStackHeartbeatSuccess(): Promise<void> {
  const baseUrl = getHeartbeatBaseUrl();
  if (!baseUrl) {
    return;
  }

  await sendHeartbeatRequest(baseUrl);
}

/** Report a pipeline or process failure with exit code and diagnostic output. */
export async function reportBetterStackHeartbeatFailure(args: {
  exitCode?: number;
  output: string;
  context?: string;
}): Promise<void> {
  const baseUrl = getHeartbeatBaseUrl();
  if (!baseUrl) {
    return;
  }

  const exitCode = args.exitCode ?? 1;
  const output = args.context ? `${args.context}\n\n${args.output}` : args.output;

  if (!output.trim()) {
    await sendHeartbeatRequest(`${baseUrl}/fail`);
    return;
  }

  await sendHeartbeatRequest(`${baseUrl}/${exitCode}`, {
    method: "POST",
    body: output,
  });
}
/** Report fatal process errors (uncaught exceptions, startup failures) then exit. */
export function registerBetterStackCronProcessMonitoring(): void {
  const reportFatalAndExit = (label: string, error: unknown, exitCode: number) => {
    console.error(label, error);
    void reportBetterStackHeartbeatFailure({
      exitCode,
      output: formatErrorForHeartbeat(error),
      context: label,
    }).finally(() => {
      process.exit(exitCode);
    });
  };

  process.on("uncaughtException", (error) => {
    reportFatalAndExit("[CRON] Uncaught exception", error, 1);
  });

  process.on("unhandledRejection", (reason) => {
    reportFatalAndExit("[CRON] Unhandled rejection", reason, 1);
  });
}
