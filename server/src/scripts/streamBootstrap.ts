import "dotenv/config";
import {
  STREAM_CONTEST_FEED_GROUP,
  STREAM_CUTBOT_USER_ID,
  STREAM_CUTBOT_USER_NAME,
} from "../services/stream/constants.js";
import { requireStreamFeedsClient } from "../services/stream/streamFeedsClient.js";
import { upsertStreamUsers } from "../services/stream/resolveMentionedUsers.js";

async function main(): Promise<void> {
  const client = requireStreamFeedsClient();

  await upsertStreamUsers([
    { id: STREAM_CUTBOT_USER_ID, name: STREAM_CUTBOT_USER_NAME },
  ]);
  console.log(`[stream-bootstrap] Upserted user ${STREAM_CUTBOT_USER_ID}`);

  const group = await client.feeds.getOrCreateFeedGroup({
    id: STREAM_CONTEST_FEED_GROUP,
    default_visibility: "public",
    activity_selectors: [{ type: "current_feed" }],
    custom: {
      description: "Per-contest Cutbot commentary feed",
    },
  });

  console.log(
    JSON.stringify(
      {
        feedGroupId: group.feed_group.id,
        wasCreated: group.was_created,
        defaultVisibility: group.feed_group.default_visibility,
      },
      null,
      2,
    ),
  );

  console.log(`
[stream-bootstrap] Next: in the Stream Dashboard, configure the "${STREAM_CONTEST_FEED_GROUP}" feed group so authenticated users can:
  - read-feed / watch
  - add-reaction / delete-reaction (own)
and cannot:
  - add-activity / update-activity / delete-activity
  - add-comment / add-comment-reaction
Users should also be able to read/watch/mark-read their own notification:{userId} feed.
`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
