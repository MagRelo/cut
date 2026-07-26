import "dotenv/config";
import { parseContestCommentaryFeedDocument } from "@cut/sport-pga-golf";
import { gracefulShutdown, prisma } from "../lib/prisma.js";
import { publishContestFeedItemsToStream } from "../services/stream/publishContestFeedToStream.js";
import { isStreamFeedsEnabled } from "../services/stream/streamFeedsClient.js";

async function main(): Promise<void> {
  const contestId = process.argv[2];
  if (!contestId) {
    throw new Error("Usage: script:stream-backfill-contest <contestId>");
  }
  if (!isStreamFeedsEnabled()) {
    throw new Error(
      "Stream Feeds is not enabled. Set STREAM_FEEDS_ENABLED=true and credentials.",
    );
  }

  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { id: true, commentaryFeed: true },
  });
  if (!contest) {
    throw new Error(`Contest not found: ${contestId}`);
  }

  const document = parseContestCommentaryFeedDocument(contest.commentaryFeed);
  // Publish oldest first so upsert order matches chronological creation.
  const items = [...document.items].reverse();
  const result = await publishContestFeedItemsToStream({
    contestId,
    items,
  });

  console.log(
    JSON.stringify(
      {
        contestId,
        itemCount: items.length,
        ...result,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(gracefulShutdown);
