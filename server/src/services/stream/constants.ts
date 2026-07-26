/**
 * Custom Stream Feeds v3 group for per-contest Cutbot posts.
 * Feed id = contest UUID → `contest:{contestId}`.
 * Created via `feeds.createFeedGroup` / `getOrCreateFeedGroup`.
 * @see https://getstream.io/activity-feeds/docs/javascript/feed-groups/
 */
export const STREAM_CONTEST_FEED_GROUP = "contest";

/** Stream user id for Cutbot-authored activities. */
export const STREAM_CUTBOT_USER_ID = "cutbot";

export const STREAM_CUTBOT_USER_NAME = "Cutbot";
