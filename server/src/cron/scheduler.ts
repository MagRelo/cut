import cron from "node-cron";
import { prisma } from "../lib/prisma.js";

// Import services
import { updateTournament } from "../services/updateTournament.js";
import { updateTournamentPlayerScores } from "../services/updateTournamentPlayers.js";
import { updateContestLineups } from "../services/updateContestLineups.js";
import { batchActivateContests } from "../services/batch/batchActivateContests.js";
import { batchSettleContests } from "../services/batch/batchSettleContests.js";
import { batchCloseContests } from "../services/batch/batchCloseContests.js";
import { batchLockContests } from "../services/batch/batchLockContests.js";

class CronScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isEnabled: boolean;
  private pipelineRunning: boolean = false;

  constructor(enabled: boolean = true) {
    this.isEnabled = enabled;
  }

  private async executeWithErrorHandling(
    jobName: string,
    task: () => Promise<void | any>
  ): Promise<void> {
    try {
      console.log(`[CRON] ${jobName} - Starting...`);
      const result = await task();

      // If the task returns a BatchOperationResult, log it
      if (result && typeof result === "object" && "total" in result) {
        console.log(
          `[CRON] ${jobName} - Completed: ${result.succeeded}/${result.total} succeeded, ${result.failed} failed`
        );
      } else {
        console.log(`[CRON] ${jobName} - Completed`);
      }
    } catch (error) {
      console.error(`[CRON] ${jobName} - Error:`, error);

      // If it's a connection error, wait before continuing (hardcoded 30 seconds)
      if ((error as any)?.code === "P2037" || (error as any)?.message?.includes("connection")) {
        console.log(`[CRON] ${jobName} - Connection error, waiting 30 seconds before next attempt`);
        await new Promise((resolve) => setTimeout(resolve, 30000));
      }
    }
  }

  private async shouldRunPlayerUpdates(): Promise<boolean> {
    try {
      const currentTournament = await prisma.tournament.findFirst({
        where: { manualActive: true },
        orderBy: { createdAt: "desc" },
      });

      if (!currentTournament) {
        console.log("[CRON] Player Updates - Skipped: No tournament is active");
        return false;
      }

      const shouldRun =
        currentTournament.status === "IN_PROGRESS" &&
        (currentTournament.roundStatusDisplay === "In Progress" ||
          currentTournament.roundStatusDisplay === "Complete");

      if (!shouldRun) {
        console.log(
          `[CRON] Player Updates - Skipped: Tournament status is ${currentTournament.status}`
        );
      }

      return shouldRun;
    } catch (error) {
      console.error("[CRON] Error checking tournament status:", error);
      return false; // Don't run on error to be safe
    }
  }

  private async runDataUpdatePipeline(): Promise<void> {
    // Prevent overlapping pipeline executions
    if (this.pipelineRunning) {
      console.log("[CRON] Data Pipeline - Skipped: Pipeline already running");
      return;
    }

    this.pipelineRunning = true;
    const startTime = Date.now();
    console.log(
      `[CRON] ========== Starting Data Update Pipeline (${new Date().toISOString()}) ==========`
    );

    try {

      // Step 1: Update tournament
      await this.executeWithErrorHandling("Update Tournament", updateTournament);

      // Step 2: Update player scores & contest lineups 
      const shouldRunPlayerUpdates = await this.shouldRunPlayerUpdates();
      if (shouldRunPlayerUpdates) {
        await this.executeWithErrorHandling("Update Players",updateTournamentPlayerScores);
        await this.executeWithErrorHandling("Update Contest Lineups", updateContestLineups);
      } else {
        console.log("[CRON] Player Updates - Skipped: Tournament is not active");
      }

      // Step 3: Update contest lifecycle
      await this.executeWithErrorHandling("Activate Contests", batchActivateContests);
      await this.executeWithErrorHandling("Lock Contests", batchLockContests);
      await this.executeWithErrorHandling("Settle Contests", batchSettleContests);
      await this.executeWithErrorHandling("Close Contests", batchCloseContests);

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
      // console.log("[CRON] Cron scheduler is disabled");
      return;
    }

    console.log("[CRON] Starting cron scheduler...");

    // Main data update pipeline - runs every 5 minutes
    // Executes jobs in sequence: Tournament → Activate → Players → Lineups → Settle → Close
    const mainPipelineJob = cron.schedule("*/5 * * * *", () => {
      this.runDataUpdatePipeline();
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
    const activeJobs = Array.from(this.jobs.keys());
    return {
      enabled: this.isEnabled,
      activeJobs,
    };
  }
}

export default CronScheduler;
