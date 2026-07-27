import { claimNextCommentaryFeedJob } from "./commentaryFeedJobs.js";
import { processCommentaryFeedJob } from "./processCommentaryFeedJob.js";

const IDLE_SLEEP_MS = 3_000;
const ERROR_SLEEP_MS = 5_000;

let running = false;
let stopRequested = false;
let loopPromise: Promise<void> | null = null;

function commentaryWorkerEnabled(): boolean {
  return (
    process.env.CONTEST_COMMENTARY_ENABLED === "true" &&
    Boolean(process.env.CURSOR_API_KEY?.trim())
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLoop(): Promise<void> {
  console.log("[feedWorker] Started (concurrency 1)");
  while (!stopRequested) {
    try {
      const job = await claimNextCommentaryFeedJob();
      if (!job) {
        await sleep(IDLE_SLEEP_MS);
        continue;
      }
      console.log(
        `[feedWorker] Claimed ${job.id} contest=${job.contestId} attempts=${job.attempts}`,
      );
      await processCommentaryFeedJob(job);
    } catch (error) {
      console.error("[feedWorker] Loop error:", error);
      await sleep(ERROR_SLEEP_MS);
    }
  }
  console.log("[feedWorker] Stopped");
}

/** Start the in-process feed worker if commentary is enabled. Idempotent. */
export function startCommentaryFeedWorker(): void {
  if (!commentaryWorkerEnabled()) {
    console.log(
      "[feedWorker] Not started (CONTEST_COMMENTARY_ENABLED / CURSOR_API_KEY)",
    );
    return;
  }
  if (running) {
    return;
  }
  running = true;
  stopRequested = false;
  loopPromise = runLoop().finally(() => {
    running = false;
    loopPromise = null;
  });
}

/** Request worker stop (best-effort; current job may finish). */
export function stopCommentaryFeedWorker(): void {
  stopRequested = true;
}

export function isCommentaryFeedWorkerRunning(): boolean {
  return running;
}

export async function awaitCommentaryFeedWorkerStop(): Promise<void> {
  stopRequested = true;
  if (loopPromise) {
    await loopPromise;
  }
}
