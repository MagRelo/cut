import {
  generateFeedItemsFromFrozenStories,
  persistContestFeed,
} from "./generateContestFeed.js";
import { publishContestFeedItemsToStream } from "../../../services/stream/publishContestFeedToStream.js";
import {
  markCommentaryFeedJobDone,
  markCommentaryFeedJobFailed,
  type ClaimedCommentaryFeedJob,
} from "./commentaryFeedJobs.js";
import { withCommentaryLlmLock } from "../../../lib/commentaryLlmMutex.js";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Process one claimed feed job under the LLM mutex.
 */
export async function processCommentaryFeedJob(
  job: ClaimedCommentaryFeedJob,
): Promise<void> {
  try {
    await withCommentaryLlmLock(async () => {
      const result = await generateFeedItemsFromFrozenStories(
        job.contestId,
        job.payload.stories,
      );
      if (result.newItems.length > 0 || result.document.lastContext != null) {
        await persistContestFeed(
          job.contestId,
          result.document,
          result.generatedAt,
        );
      }
      if (result.newItems.length > 0) {
        await publishContestFeedItemsToStream({
          contestId: job.contestId,
          items: result.newItems as unknown as Parameters<
            typeof publishContestFeedItemsToStream
          >[0]["items"],
        });
      }
    });
    await markCommentaryFeedJobDone(job.id);
    console.log(
      `[processCommentaryFeedJob] ${job.id} contest=${job.contestId} done (${job.payload.stories.length} stories)`,
    );
  } catch (error) {
    const message = errorMessage(error);
    console.error(
      `[processCommentaryFeedJob] ${job.id} contest=${job.contestId} failed:`,
      error,
    );
    const retry = job.attempts < 3;
    await markCommentaryFeedJobFailed(job.id, message, {
      retry,
      ...(retry
        ? { runAfter: new Date(Date.now() + job.attempts * 60_000) }
        : {}),
    });
  }
}
