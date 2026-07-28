import cron from "node-cron";
import { getActiveEvents } from "../services/events/getActiveEvents.js";
import { runSportEventPipeline } from "../services/cron/runSportEventPipeline.js";
import { batchActivateContests } from "../services/batch/batchActivateContests.js";
import { batchSettleContests } from "../services/batch/batchSettleContests.js";
import { batchCloseContests } from "../services/batch/batchCloseContests.js";
import { batchSyncReferralGraph } from "../services/batch/batchSyncReferralGraph.js";
import { refreshOpenSideBetQuotes } from "../services/sideBets/refreshOpenSideBetQuotes.js";
import { refreshContestOverviews } from "../sports/pga-golf/commentary/refreshContestOverviews.js";
import { refreshCommoditiesContestOverviews } from "../sports/commodities/commentary/refreshCommoditiesContestOverviews.js";
import {
  startCommentaryFeedWorker,
  stopCommentaryFeedWorker,
} from "../sports/pga-golf/commentary/feedWorker.js";
import {
  formatErrorForHeartbeat,
  reportBetterStackHeartbeatFailure,
  reportBetterStackHeartbeatSuccess,
} from "../services/observability/betterStackHeartbeat.js";
import type { BatchOperationResult } from "../services/shared/types.js";

class CronScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isEnabled: boolean;
  private scorePipelineRunning = false;
  private overviewPipelineRunning = false;

  constructor(enabled: boolean = true) {
    this.isEnabled = enabled;
  }

  private formatBatchFailureDetails(batch: BatchOperationResult): string[] {
    return batch.results
      .filter((r) => !r.success && r.error && !r.error.startsWith("deferred:"))
      .map((r) => `${r.contestId}: ${r.error}`)
      .slice(0, 25);
  }

  private async executeWithErrorHandling(
    jobName: string,
    task: () => Promise<void | unknown>,
    pipelineErrors: string[],
  ): Promise<void> {
    try {
      console.log(`[CRON] ${jobName} - Starting...`);
      const result = await task();

      if (result && typeof result === "object" && "total" in result) {
        const batch = result as BatchOperationResult & {
          deferred?: number;
          results?: BatchOperationResult["results"];
        };
        const deferred = typeof batch.deferred === "number" ? batch.deferred : 0;
        console.log(
          `[CRON] ${jobName} - Completed: ${batch.succeeded}/${batch.total} succeeded, ${batch.failed} failed${deferred > 0 ? `, ${deferred} deferred` : ""}`,
        );
        if (batch.failed > 0) {
          const failureDetails = Array.isArray(batch.results)
            ? this.formatBatchFailureDetails(batch as BatchOperationResult)
            : [];
          const summary = `${jobName}: ${batch.failed}/${batch.total} batch operations failed`;
          if (failureDetails.length > 0) {
            console.error(`[CRON] ${jobName} failures:`);
            for (const detail of failureDetails) {
              console.error(`[CRON]   - ${detail}`);
            }
            pipelineErrors.push(`${summary}\n${failureDetails.map((d) => `  - ${d}`).join("\n")}`);
          } else {
            console.error(`[CRON] ${summary} (no per-item error details)`);
            pipelineErrors.push(summary);
          }
        }
      } else {
        console.log(`[CRON] ${jobName} - Completed`);
      }
    } catch (error) {
      console.error(`[CRON] ${jobName} - Error:`, error);
      pipelineErrors.push(`${jobName}: ${formatErrorForHeartbeat(error)}`);

      if (
        (error as { code?: string })?.code === "P2037" ||
        (error as Error)?.message?.includes("connection")
      ) {
        console.log(`[CRON] ${jobName} - Connection error, waiting 30 seconds before next attempt`);
        await new Promise((resolve) => setTimeout(resolve, 30000));
      }
    }
  }

  private async runScorePipeline(): Promise<void> {
    if (this.scorePipelineRunning) {
      console.log("[CRON] Score Pipeline - Skipped: already running");
      return;
    }

    this.scorePipelineRunning = true;
    const startTime = Date.now();
    console.log(
      `[CRON] ========== Starting Score Pipeline (${new Date().toISOString()}) ==========`,
    );

    const pipelineErrors: string[] = [];

    try {
      const events = await getActiveEvents();

      for (const event of events) {
        await this.executeWithErrorHandling(
          `Sport pipeline (${event.sportId}/${event.id})`,
          () => runSportEventPipeline(event.id, event.sportId),
          pipelineErrors,
        );
      }

      await this.executeWithErrorHandling(
        "Refresh Side Bet Quotes",
        refreshOpenSideBetQuotes,
        pipelineErrors,
      );

      await this.executeWithErrorHandling(
        "Activate Contests",
        batchActivateContests,
        pipelineErrors,
      );
      await this.executeWithErrorHandling("Settle Contests", batchSettleContests, pipelineErrors);
      await this.executeWithErrorHandling("Close Contests", batchCloseContests, pipelineErrors);
      await this.executeWithErrorHandling(
        "Sync Referral Graph",
        batchSyncReferralGraph,
        pipelineErrors,
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (pipelineErrors.length > 0) {
        console.error(
          `[CRON] ========== Score Pipeline Finished With Errors (${duration}s, ${pipelineErrors.length} issue(s)) ==========`,
        );
        for (const issue of pipelineErrors) {
          console.error(`[CRON] Issue:\n${issue}`);
        }
        await reportBetterStackHeartbeatFailure({
          exitCode: 1,
          context: `Score pipeline finished with ${pipelineErrors.length} error(s) in ${duration}s`,
          output: pipelineErrors.join("\n\n"),
        });
        return;
      }

      console.log(`[CRON] ========== Score Pipeline Complete (${duration}s) ==========`);
      await reportBetterStackHeartbeatSuccess();
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error("[CRON] Score pipeline error:", error);
      await reportBetterStackHeartbeatFailure({
        exitCode: 1,
        context: `Score pipeline failed after ${duration}s`,
        output: formatErrorForHeartbeat(error),
      });
    } finally {
      this.scorePipelineRunning = false;
    }
  }

  private async runOverviewPipeline(): Promise<void> {
    if (this.overviewPipelineRunning) {
      console.log("[CRON] Overview Pipeline - Skipped: already running");
      return;
    }

    this.overviewPipelineRunning = true;
    const startTime = Date.now();
    console.log(
      `[CRON] ========== Starting Overview Pipeline (${new Date().toISOString()}) ==========`,
    );

    const pipelineErrors: string[] = [];

    try {
      await this.executeWithErrorHandling(
        "Refresh Contest Overviews",
        refreshContestOverviews,
        pipelineErrors,
      );
      await this.executeWithErrorHandling(
        "Refresh Commodities Contest Overviews",
        refreshCommoditiesContestOverviews,
        pipelineErrors,
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      if (pipelineErrors.length > 0) {
        console.error(
          `[CRON] ========== Overview Pipeline Finished With Errors (${duration}s) ==========`,
        );
        for (const issue of pipelineErrors) {
          console.error(`[CRON] Issue:\n${issue}`);
        }
        return;
      }
      console.log(`[CRON] ========== Overview Pipeline Complete (${duration}s) ==========`);
    } catch (error) {
      console.error("[CRON] Overview pipeline error:", error);
    } finally {
      this.overviewPipelineRunning = false;
    }
  }

  public start(): void {
    if (!this.isEnabled) {
      return;
    }

    console.log("[CRON] Starting cron scheduler...");

    const scorePipelineJob = cron.schedule("*/5 * * * *", () => {
      void this.runScorePipeline();
    });
    this.jobs.set("scorePipeline", scorePipelineJob);

    const overviewPipelineJob = cron.schedule("*/20 * * * *", () => {
      void this.runOverviewPipeline();
    });
    this.jobs.set("overviewPipeline", overviewPipelineJob);

    startCommentaryFeedWorker();

    console.log("[CRON] All cron jobs scheduled successfully");
  }

  public stop(): void {
    console.log("[CRON] Stopping cron scheduler...");
    stopCommentaryFeedWorker();
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
