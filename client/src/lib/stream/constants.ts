/**
 * Custom Stream Feeds v3 group for per-contest Cutbot posts.
 * Feed id = contest UUID → `contest:{contestId}`.
 * @see https://getstream.io/activity-feeds/docs/javascript/feed-groups/
 */
export const STREAM_CONTEST_FEED_GROUP = "contest";

/** When false, Cutbot posts hide the reaction bar (Stream still supports reactions). */
export const STREAM_REACTIONS_ENABLED = false;

export const STREAM_REACTION_TYPES = ["like", "dislike", "fire"] as const;
export type StreamReactionType = (typeof STREAM_REACTION_TYPES)[number];

/** Accessible name for each reaction (aria-label). */
export const STREAM_REACTION_LABELS: Record<StreamReactionType, string> = {
  like: "Like",
  dislike: "Disappointed",
  fire: "Fire",
};

export const STREAM_REACTION_EMOJIS: Record<StreamReactionType, string> = {
  like: "👍",
  dislike: "😑",
  fire: "🔥",
};

export function isStreamClientConfigured(): boolean {
  return Boolean(import.meta.env.VITE_STREAM_API_KEY?.trim());
}
