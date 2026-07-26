export const STREAM_CONTEST_FEED_GROUP = "contest";

export const STREAM_REACTION_TYPES = ["like", "fire", "golf"] as const;
export type StreamReactionType = (typeof STREAM_REACTION_TYPES)[number];

export const STREAM_REACTION_LABELS: Record<StreamReactionType, string> = {
  like: "Like",
  fire: "Fire",
  golf: "Nice shot",
};

export function isStreamClientConfigured(): boolean {
  return Boolean(import.meta.env.VITE_STREAM_API_KEY?.trim());
}
