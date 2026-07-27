import { Hono } from "hono";

const cronRouter = new Hono();

const PIPELINE_STEPS = [
  "scorePipeline (*/5 * * * *)",
  "getActiveEvents → runSportEventPipeline per active event (incl. golf afterLiveScoreSync classify/enqueue)",
  "refreshSideBetQuotes (golf; when SIDE_BETS_ENABLED + DATAGOLF_API_KEY)",
  "batchActivateContests",
  "batchSettleContests",
  "batchCloseContests",
  "batchSyncReferralGraph",
  "overviewPipeline (*/20 * * * *) → refreshContestOverviews + refreshCommoditiesContestOverviews",
  "feedWorker (in-process; CommentaryFeedJob queue, concurrency 1)",
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
    activeJobs: enabled ? ["scorePipeline", "overviewPipeline"] : [],
    pipelineSteps: enabled ? [...PIPELINE_STEPS] : [],
    timestamp: new Date().toISOString(),
  });
});

export default cronRouter;
