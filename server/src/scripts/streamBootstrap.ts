import dotenv from "dotenv";

// Match server startup: env-specific file, then root `.env` overrides.
dotenv.config({ path: ".env.development" });
dotenv.config({ path: ".env", override: true });

import {
  STREAM_CONTEST_FEED_GROUP,
  STREAM_CUTBOT_USER_ID,
  STREAM_CUTBOT_USER_NAME,
} from "../services/stream/constants.js";
import { requireStreamFeedsClient } from "../services/stream/streamFeedsClient.js";
import { upsertStreamUsers } from "../services/stream/resolveMentionedUsers.js";

function streamErrorDetail(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const withExtra = error as Error & {
    code?: unknown;
    metadata?: unknown;
  };
  const parts = [error.message];
  if (withExtra.code != null) parts.push(`code=${String(withExtra.code)}`);
  if (withExtra.metadata != null) {
    parts.push(`metadata=${JSON.stringify(withExtra.metadata)}`);
  }
  return parts.join(" | ");
}

/**
 * Creates the custom `contest` feed group per Stream Feeds v3 docs.
 * @see https://getstream.io/activity-feeds/docs/node/feed-groups/
 *
 * `current_feed` selects activities posted directly to each contest feed
 * (`contest:{contestId}`). Visibility is public so authenticated users can read.
 */
async function main(): Promise<void> {
  const client = requireStreamFeedsClient();

  await upsertStreamUsers([
    { id: STREAM_CUTBOT_USER_ID, name: STREAM_CUTBOT_USER_NAME },
  ]);
  console.log(`[stream-bootstrap] Upserted user ${STREAM_CUTBOT_USER_ID}`);

  // Documented create-or-return — do not get-then-create; "not found" errors
  // use code 16 / responseCode 404 without "404" in the message text.
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
        activitySelectors: group.feed_group.activity_selectors,
        contestPostsUse: `${STREAM_CONTEST_FEED_GROUP}:{contestId}`,
        mentionsUse: "notification:{userId}",
      },
      null,
      2,
    ),
  );

  console.log(`
[stream-bootstrap] OK — custom feed group "${STREAM_CONTEST_FEED_GROUP}" ready.
  Contest Cutbot posts → ${STREAM_CONTEST_FEED_GROUP}:{contestId}
  Mention unread badge → notification:{userId} (built-in)

In the Stream Dashboard, set permissions on "${STREAM_CONTEST_FEED_GROUP}" so users can
read/watch and react, but cannot create activities or comments.
`);
}

main().catch((error: unknown) => {
  console.error(`[stream-bootstrap] ${streamErrorDetail(error)}`);
  console.error(`
[stream-bootstrap] Failed to getOrCreate feed group via Feeds API.
  Docs: https://getstream.io/activity-feeds/docs/node/feed-groups/
  Ensure STREAM_API_KEY / STREAM_API_SECRET are from an Activity Feeds v3 app
  and STREAM_FEEDS_ENABLED=true.
`);
  process.exitCode = 1;
});
