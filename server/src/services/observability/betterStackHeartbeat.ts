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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendHeartbeatRequest(
  url: string,
  options?: { method?: "GET" | "POST"; body?: string },
): Promise<void> {
  const method = options?.method ?? "GET";

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const init: RequestInit = {
        method,
        signal: AbortSignal.timeout(HEARTBEAT_TIMEOUT_MS),
      };
      if (options?.body !== undefined) {
        init.headers = { "Content-Type": "text/plain; charset=utf-8" };
        init.body = options.body;
      }
      const response = await fetch(url, init);
      if (!response.ok) {
        console.warn(
          `[CRON] Better Stack heartbeat request failed: HTTP ${response.status} (${url})`,
        );
      }
      return;
    } catch (error) {
      if (attempt === 1) {
        await sleep(1_000);
        continue;
      }
      console.warn("[CRON] Better Stack heartbeat request failed:", error);
    }
  }
}

function errorText(error: unknown, depth = 0): string {
  if (depth > 5 || error == null) {
    return "";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    const extra = error as { code?: unknown; rawMessage?: unknown; cause?: unknown };
    return [
      error.name,
      error.message,
      extra.code,
      extra.rawMessage,
      errorText(extra.cause, depth + 1),
    ]
      .filter((part) => part != null && part !== "")
      .join(" ");
  }
  return String(error);
}

/**
 * Dropped connections and timeouts that clear on their own.
 * These must not exit the cron process or open a heartbeat incident.
 */
export function isTransientProcessError(error: unknown): boolean {
  return /\b(?:ECONNRESET|ECONNREFUSED|EAI_AGAIN|ETIMEDOUT|EPIPE|UND_ERR_\w*|AbortError|TimeoutError)\b|socket hang up|The operation was aborted/i.test(
    errorText(error),
  );
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
    if (isTransientProcessError(error)) {
      console.error("[CRON] Transient uncaught exception (process kept alive):", error);
      return;
    }
    reportFatalAndExit("[CRON] Uncaught exception", error, 1);
  });

  process.on("unhandledRejection", (reason) => {
    if (isTransientProcessError(reason)) {
      console.error("[CRON] Transient unhandled rejection (process kept alive):", reason);
      return;
    }
    reportFatalAndExit("[CRON] Unhandled rejection", reason, 1);
  });
}
