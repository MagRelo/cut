import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

const cronRouter = new Hono();

const PIPELINE_STEPS = [
  "scorePipeline (*/5 * * * *)",
  "maybePromotePreparedGolfEvent (COMPLETE golf → prepared next event)",
  "getActiveEvents → runSportEventPipeline per active event (incl. golf afterLiveScoreSync classify/enqueue)",
  "batchActivateContests",
  "batchSettleContests",
  "batchSyncReferralGraph",
  "flushPendingContestAnnouncementEmails",
  "overviewPipeline (*/20 * * * *) → refreshContestOverviews + refreshCommoditiesContestOverviews",
  "eventInitPipeline (0 10 * * * America/New_York) → Saturday commodities, Monday golf",
  "feedWorker (in-process; CommentaryFeedJob queue, concurrency 1)",
] as const;

cronRouter.get("/status", requireAuth, requireAdmin, (c) => {
  const enabled = process.env.ENABLE_CRON === "true";

  return c.json({
    enabled,
    status: enabled ? "active" : "disabled",
    message: enabled
      ? "Cron scheduler is running. Check server logs for detailed job execution status."
      : "Cron scheduler is disabled. Set ENABLE_CRON=true to enable.",
    environment: process.env.NODE_ENV || "development",
    activeJobs: enabled ? ["scorePipeline", "overviewPipeline", "eventInitPipeline"] : [],
    pipelineSteps: enabled ? [...PIPELINE_STEPS] : [],
    timestamp: new Date().toISOString(),
  });
});

export default cronRouter;
