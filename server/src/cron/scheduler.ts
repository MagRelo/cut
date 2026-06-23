import cron from "node-cron";
import { getActiveEvents } from "../services/events/getActiveEvents.js";
import { runSportEventPipeline } from "../services/cron/runSportEventPipeline.js";
import { batchActivateContests } from "../services/batch/batchActivateContests.js";
import { batchSettleContests } from "../services/batch/batchSettleContests.js";
import { batchCloseContests } from "../services/batch/batchCloseContests.js";
import { batchSyncReferralGraph } from "../services/batch/batchSyncReferralGraph.js";
import { refreshOpenSideBetQuotes } from "../services/sideBets/refreshOpenSideBetQuotes.js";
import type { BatchOperationResult } from "../services/shared/types.js";

class CronScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isEnabled: boolean;
  private pipelineRunning = false;

  constructor(enabled: boolean = true) {
    this.isEnabled = enabled;
  }

  private async executeWithErrorHandling(
    jobName: string,
    task: () => Promise<void | unknown>,
  ): Promise<void> {
    try {
      console.log(`[CRON] ${jobName} - Starting...`);
      const result = await task();

      if (result && typeof result === "object" && "total" in result) {
        const batch = result as BatchOperationResult & { deferred?: number };
        const deferred = typeof batch.deferred === "number" ? batch.deferred : 0;
        console.log(
          `[CRON] ${jobName} - Completed: ${batch.succeeded}/${batch.total} succeeded, ${batch.failed} failed${deferred > 0 ? `, ${deferred} deferred` : ""}`,
        );
      } else {
        console.log(`[CRON] ${jobName} - Completed`);
      }
    } catch (error) {
      console.error(`[CRON] ${jobName} - Error:`, error);

      if ((error as { code?: string })?.code === "P2037" || (error as Error)?.message?.includes("connection")) {
        console.log(`[CRON] ${jobName} - Connection error, waiting 30 seconds before next attempt`);
        await new Promise((resolve) => setTimeout(resolve, 30000));
      }
    }
  }

  private async runDataUpdatePipeline(): Promise<void> {
    if (this.pipelineRunning) {
      console.log("[CRON] Data Pipeline - Skipped: Pipeline already running");
      return;
    }

    this.pipelineRunning = true;
    const startTime = Date.now();
    console.log(
      `[CRON] ========== Starting Data Update Pipeline (${new Date().toISOString()}) ==========`,
    );

    try {
      const events = await getActiveEvents();

      for (const event of events) {
        await this.executeWithErrorHandling(
          `Sport pipeline (${event.sportId}/${event.id})`,
          () => runSportEventPipeline(event.id, event.sportId),
        );
      }

      await this.executeWithErrorHandling("Refresh Side Bet Quotes", refreshOpenSideBetQuotes);

      await this.executeWithErrorHandling("Activate Contests", batchActivateContests);
      await this.executeWithErrorHandling("Settle Contests", batchSettleContests);
      await this.executeWithErrorHandling("Close Contests", batchCloseContests);
      await this.executeWithErrorHandling("Sync Referral Graph", batchSyncReferralGraph);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[CRON] ========== Pipeline Complete (${duration}s) ==========`);
    } catch (error) {
      console.error("[CRON] Pipeline error:", error);
    } finally {
      this.pipelineRunning = false;
    }
  }

  public start(): void {
    if (!this.isEnabled) {
      return;
    }

    console.log("[CRON] Starting cron scheduler...");

    const mainPipelineJob = cron.schedule("*/5 * * * *", () => {
      void this.runDataUpdatePipeline();
    });
    this.jobs.set("mainPipeline", mainPipelineJob);

    console.log("[CRON] All cron jobs scheduled successfully");
  }

  public stop(): void {
    console.log("[CRON] Stopping cron scheduler...");
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`[CRON] Stopped job: ${name}`);
    });
    this.jobs.clear();
  }

  public getStatus(): { enabled: boolean; activeJobs: string[] } {
    return {
      enabled: this.isEnabled,
      activeJobs: Array.from(this.jobs.keys()),
    };
  }
}

export default CronScheduler;
