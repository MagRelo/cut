import cron from "node-cron";
import { prisma } from "../lib/prisma.js";

// Import services
import { initTournament } from "../services/initTournament.js";
import { updateTournament } from "../services/updateTournament.js";
import { updateTournamentPlayerScores } from "../services/updateTournamentPlayers.js";
import { updateContestLineups } from "../services/updateContestLineups.js";
import { closeEscrowDeposits } from "../services/closeEscrowDeposits.js";
import { distributeContest } from "../services/distribute/distributeContest.js";

interface CronJob {
  name: string;
  schedule: string;
  task: () => Promise<void>;
  enabled: boolean;
}

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

  private async shouldSkipPlayerUpdates(): Promise<boolean> {
    try {
      const currentTournament = await prisma.tournament.findFirst({
        where: { status: "IN_PROGRESS" },
        orderBy: { createdAt: "desc" },
      });

      if (!currentTournament) {
        console.log("[CRON] No tournament in progress, skipping player updates");
        return true;
      }

      const shouldSkip =
        currentTournament.roundStatusDisplay !== "In Progress" &&
        currentTournament.roundStatusDisplay !== "Complete";

      if (shouldSkip) {
        console.log(
          `[CRON] Tournament status: ${currentTournament.roundStatusDisplay}, skipping player updates`
        );
      }

      return shouldSkip;
    } catch (error) {
      console.error("[CRON] Error checking tournament status:", error);
      return true; // Skip on error to be safe
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

    // Job 2: Close escrow deposits every 5 minutes
    const closeEscrowJob = cron.schedule("*/5 * * * *", () => {
      this.executeWithErrorHandling("Close Escrow Deposits", closeEscrowDeposits);
    });
    this.jobs.set("closeEscrowDeposits", closeEscrowJob);

    // Job 3: Distribute contests every 5 minutes
    const distributeContestJob = cron.schedule("*/5 * * * *", () => {
      this.executeWithErrorHandling("Distribute Contests", distributeContest);
    });
    this.jobs.set("distributeContest", distributeContestJob);

    // Job 4: Update player scores every 5 minutes (with conditional logic)
    const updatePlayersJob = cron.schedule("*/5 * * * *", async () => {
      const shouldSkip = await this.shouldSkipPlayerUpdates();
      if (!shouldSkip) {
        await this.executeWithErrorHandling(
          "Update Tournament Players",
          updateTournamentPlayerScores
        );
      }
    });
    this.jobs.set("updateTournamentPlayers", updatePlayersJob);

    // Job 5: Update contest lineups every 5 minutes (with conditional logic)
    const updateLineupsJob = cron.schedule("*/5 * * * *", async () => {
      const shouldSkip = await this.shouldSkipPlayerUpdates();
      if (!shouldSkip) {
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
