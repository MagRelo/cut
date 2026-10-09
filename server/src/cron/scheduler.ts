import cron from "node-cron";
import { getActiveEvents } from "../services/events/getActiveEvents.js";
import { runSportEventPipeline } from "../services/cron/runSportEventPipeline.js";
import { batchActivateContests } from "../services/batch/batchActivateContests.js";
import { batchSettleContests } from "../services/batch/batchSettleContests.js";
import { batchSyncReferralGraph } from "../services/batch/batchSyncReferralGraph.js";
import { refreshContestOverviews } from "../sports/pga-golf/commentary/refreshContestOverviews.js";
import { refreshCommoditiesContestOverviews } from "../sports/commodities/commentary/refreshCommoditiesContestOverviews.js";
import {
  startCommentaryFeedWorker,
  stopCommentaryFeedWorker,
} from "../sports/pga-golf/commentary/feedWorker.js";
import { flushPendingContestAnnouncementEmails } from "../lib/email/send/contestAnnouncement.js";
import { isAutoInitEventsEnabled, runAutoInitEvents } from "../services/autoInitEvents.js";
import { maybePromotePreparedGolfEvent } from "../sports/pga-golf/promotePreparedGolfEvent.js";
import {
  formatErrorForHeartbeat,
  reportBetterStackHeartbeatFailure,
  reportBetterStackHeartbeatSuccess,
} from "../services/observability/betterStackHeartbeat.js";
import { retryOnceOnDbConnectivity } from "./dbConnectivity.js";
import type { BatchOperationResult } from "../services/shared/types.js";

class CronScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isEnabled: boolean;
  private scorePipelineRunning = false;
  private overviewPipelineRunning = false;
  private eventInitPipelineRunning = false;

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
      const result = await retryOnceOnDbConnectivity(task, async () => {
        console.log(`[CRON] ${jobName} - Database unreachable, retrying once in 30 seconds`);
        await new Promise((resolve) => setTimeout(resolve, 30_000));
      });

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
      await this.executeWithErrorHandling(
        "Promote prepared golf event",
        maybePromotePreparedGolfEvent,
        pipelineErrors,
      );

      const events = await getActiveEvents();

      for (const event of events) {
        await this.executeWithErrorHandling(
          `Sport pipeline (${event.sportId}/${event.id})`,
          () => runSportEventPipeline(event.id, event.sportId),
          pipelineErrors,
        );
      }

      await this.executeWithErrorHandling(
        "Activate Contests",
        batchActivateContests,
        pipelineErrors,
      );
      await this.executeWithErrorHandling("Settle Contests", batchSettleContests, pipelineErrors);
      await this.executeWithErrorHandling(
        "Sync Referral Graph",
        batchSyncReferralGraph,
        pipelineErrors,
      );
      await this.executeWithErrorHandling(
        "Flush contest announcement emails",
        async () => {
          const result = await flushPendingContestAnnouncementEmails();
          console.log(
            `[CRON] Contest announcement emails — sent ${result.sent}, failed ${result.failed}, skipped ${result.skipped}`,
          );
        },
        pipelineErrors,
      );

    } catch (error) {
      console.error("[CRON] Score pipeline error:", error);
      pipelineErrors.push(`Score pipeline: ${formatErrorForHeartbeat(error)}`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    try {
      await this.finishScorePipeline(duration, pipelineErrors);
    } finally {
      this.scorePipelineRunning = false;
    }
  }

  private async finishScorePipeline(duration: string, issues: string[]): Promise<void> {
    if (issues.length === 0) {
      console.log(`[CRON] ========== Score Pipeline Complete (${duration}s) ==========`);
      await reportBetterStackHeartbeatSuccess();
      return;
    }

    console.error(
      `[CRON] ========== Score Pipeline Finished With Errors (${duration}s, ${issues.length} issue(s)) ==========`,
    );
    for (const issue of issues) {
      console.error(`[CRON] Issue:\n${issue}`);
    }
    await reportBetterStackHeartbeatFailure({
      exitCode: 1,
      context: `Score pipeline finished with ${issues.length} error(s) in ${duration}s`,
      output: issues.join("\n\n"),
    });
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

  private async runEventInitPipeline(): Promise<void> {
    if (!isAutoInitEventsEnabled()) {
      console.log("[CRON] Event Init Pipeline - Skipped: AUTO_INIT_EVENTS=false");
      return;
    }
    if (this.eventInitPipelineRunning) {
      console.log("[CRON] Event Init Pipeline - Skipped: already running");
      return;
    }

    this.eventInitPipelineRunning = true;
    const startTime = Date.now();
    console.log(
      `[CRON] ========== Starting Event Init Pipeline (${new Date().toISOString()}) ==========`,
    );

    const pipelineErrors: string[] = [];
    try {
      await this.executeWithErrorHandling(
        "Auto-init next events",
        async () => {
          const results = await runAutoInitEvents({ respectWeekday: true });
          console.log(`[CRON] Auto-init results: ${JSON.stringify(results)}`);
          if (results.some((r) => r.action === "failed")) {
            throw new Error(
              results
                .filter((r) => r.action === "failed")
                .map((r) => `${r.sportId}: ${r.reason ?? "failed"}`)
                .join("; "),
            );
          }
        },
        pipelineErrors,
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      if (pipelineErrors.length > 0) {
        console.error(
          `[CRON] ========== Event Init Pipeline Finished With Errors (${duration}s) ==========`,
        );
        for (const issue of pipelineErrors) {
          console.error(`[CRON] Issue:\n${issue}`);
        }
        return;
      }
      console.log(`[CRON] ========== Event Init Pipeline Complete (${duration}s) ==========`);
    } catch (error) {
      console.error("[CRON] Event init pipeline error:", error);
    } finally {
      this.eventInitPipelineRunning = false;
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

    const eventInitPipelineJob = cron.schedule(
      "0 10 * * *",
      () => {
        void this.runEventInitPipeline();
      },
      { timezone: "America/New_York" },
    );
    this.jobs.set("eventInitPipeline", eventInitPipelineJob);

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
