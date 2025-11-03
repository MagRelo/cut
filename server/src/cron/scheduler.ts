import cron from "node-cron";
import { prisma } from "../lib/prisma.js";

// Import services
import { updateTournament } from "../services/updateTournament.js";
import { updateTournamentPlayerScores } from "../services/updateTournamentPlayers.js";
import { updateContestLineups } from "../services/updateContestLineups.js";
import { batchActivateContests } from "../services/batch/batchActivateContests.js";
import { batchSettleContests } from "../services/batch/batchSettleContests.js";
import { batchCloseContests } from "../services/batch/batchCloseContests.js";

class CronScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isEnabled: boolean;

  constructor(enabled: boolean = true) {
    this.isEnabled = enabled;
  }

  private async executeWithErrorHandling(
    jobName: string,
    task: () => Promise<void>
  ): Promise<void> {
    try {
      console.log(`[CRON] Starting job: ${jobName}`);
      await task();
      console.log(`[CRON] Completed job: ${jobName}`);
    } catch (error) {
      console.error(`[CRON] Error in job ${jobName}:`, error);

      // If it's a connection error, wait before continuing (hardcoded 30 seconds)
      if ((error as any)?.code === "P2037" || (error as any)?.message?.includes("connection")) {
        console.log(
          `[CRON] Connection error in ${jobName}, waiting 30 seconds before next attempt`
        );
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
        console.log("[CRON] No tournament is active, skipping player updates");
        return false;
      }

      const shouldRun =
        currentTournament.status === "IN_PROGRESS" &&
        (currentTournament.roundStatusDisplay === "In Progress" ||
          currentTournament.roundStatusDisplay === "Complete");

      if (!shouldRun) {
        console.log(
          `[CRON] Tournament status: ${currentTournament.status}, skipping player updates`
        );
      }

      return shouldRun;
    } catch (error) {
      console.error("[CRON] Error checking tournament status:", error);
      return false; // Don't run on error to be safe
    }
  }

  public start(): void {
    if (!this.isEnabled) {
      // console.log("[CRON] Cron scheduler is disabled");
      return;
    }

    console.log("[CRON] Starting cron scheduler...");

    // Job 1: Update tournament every 5 minutes
    const updateTournamentJob = cron.schedule("*/5 * * * *", () => {
      this.executeWithErrorHandling("Update Tournament", updateTournament);
    });
    this.jobs.set("updateTournament", updateTournamentJob);

    // Job 2: Activate contests (OPEN → ACTIVE) every 5 minutes
    const activateContestsJob = cron.schedule("*/5 * * * *", () => {
      this.executeWithErrorHandling("Activate Contests", batchActivateContests);
    });
    this.jobs.set("batchActivateContests", activateContestsJob);

    // Job 3: Settle contests (ACTIVE/LOCKED → SETTLED) every 5 minutes
    const settleContestsJob = cron.schedule("*/5 * * * *", () => {
      this.executeWithErrorHandling("Settle Contests", batchSettleContests);
    });
    this.jobs.set("batchSettleContests", settleContestsJob);

    // Job 4: Close contests (SETTLED → CLOSED) every hour
    const closeContestsJob = cron.schedule("0 * * * *", () => {
      this.executeWithErrorHandling("Close Contests", batchCloseContests);
    });
    this.jobs.set("batchCloseContests", closeContestsJob);

    // Job 5: Update player scores every 5 minutes (with conditional logic)
    const updatePlayersJob = cron.schedule("*/5 * * * *", async () => {
      const shouldRun = await this.shouldRunPlayerUpdates();
      if (shouldRun) {
        await this.executeWithErrorHandling(
          "Update Tournament Players",
          updateTournamentPlayerScores
        );
      }
    });
    this.jobs.set("updateTournamentPlayers", updatePlayersJob);

    // Job 6: Update contest lineups every 5 minutes (with conditional logic)
    const updateLineupsJob = cron.schedule("*/5 * * * *", async () => {
      const shouldRun = await this.shouldRunPlayerUpdates();
      if (shouldRun) {
        await this.executeWithErrorHandling("Update Contest Lineups", updateContestLineups);
      }
    });
    this.jobs.set("updateContestLineups", updateLineupsJob);

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
