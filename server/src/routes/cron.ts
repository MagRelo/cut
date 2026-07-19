import { Hono } from "hono";

const cronRouter = new Hono();

const PIPELINE_STEPS = [
  "mainPipeline (*/5 * * * *)",
  "getActiveEvents → runSportEventPipeline per active event",
  "refreshOpenSideBetQuotes (when SIDE_BETS_ENABLED + DATAGOLF_API_KEY)",
  "batchActivateContests",
  "batchGenerateContestCommentary (when enabled; 20-minute freshness cutoff)",
  "batchSettleContests",
  "batchCloseContests",
  "batchSyncReferralGraph",
] as const;

// Get cron status
cronRouter.get("/status", (c) => {
  const enabled = process.env.ENABLE_CRON === "true";

  return c.json({
    enabled,
    status: enabled ? "active" : "disabled",
    message: enabled
      ? "Cron scheduler is running. Check server logs for detailed job execution status."
      : "Cron scheduler is disabled. Set ENABLE_CRON=true to enable.",
    environment: process.env.NODE_ENV || "development",
    activeJobs: enabled ? ["mainPipeline"] : [],
    pipelineSteps: enabled ? [...PIPELINE_STEPS] : [],
    timestamp: new Date().toISOString(),
  });
});

export default cronRouter;
