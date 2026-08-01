/**
 * Custom Stream Feeds v3 group for per-contest Cutbot posts.
 * Feed id = contest UUID → `contest:{contestId}`.
 * @see https://getstream.io/activity-feeds/docs/javascript/feed-groups/
 */
export const STREAM_CONTEST_FEED_GROUP = "contest";

/** Cutbot posts expose Stream's reaction bar to connected users. */
export const STREAM_REACTIONS_ENABLED = true;

export const STREAM_REACTION_TYPES = [
  "fire",
  "like",
  "money",
  "laugh",
  "dislike",
] as const;
export type StreamReactionType = (typeof STREAM_REACTION_TYPES)[number];

/** Accessible name for each reaction (aria-label). */
export const STREAM_REACTION_LABELS: Record<StreamReactionType, string> = {
  fire: "Fire",
  like: "Like",
  money: "Money",
  laugh: "Laugh",
  dislike: "Bummer",
};

export const STREAM_REACTION_EMOJIS: Record<StreamReactionType, string> = {
  fire: "🔥",
  like: "👍",
  money: "💸",
  laugh: "😂",
  dislike: "😑",
};

export function isStreamClientConfigured(): boolean {
  return Boolean(import.meta.env.VITE_STREAM_API_KEY?.trim());
}
