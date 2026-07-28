import { buildCommoditiesContestCommentaryPrompt } from "@cut/sport-commodities";
import { buildPgaContestCommentaryPrompt } from "@cut/sport-pga-golf";
import {
  DEFAULT_CONTEST_COMMENTARY_VOICE_ID,
  type ContestCommentaryVoiceId,
} from "@cut/sport-sdk";

export const COMMENTARY_MIN_WORDS = 125;
export const COMMENTARY_MAX_WORDS = 175;

export type ContestCommentaryPromptContext = unknown;

function isCommoditiesContext(context: unknown): boolean {
  if (!context || typeof context !== "object") return false;
  const value = context as Record<string, unknown>;
  return (
    "dayMovers" in value &&
    "eventProgress" in value &&
    typeof value.eventProgress === "object" &&
    value.eventProgress != null &&
    "dayLabel" in (value.eventProgress as object)
  );
}

/** Golf-owned prompt builder (kept under sport IO). */
export function buildGolfContestCommentaryPrompt(
  context: unknown,
  correctiveFeedback?: string,
  voiceId: ContestCommentaryVoiceId = DEFAULT_CONTEST_COMMENTARY_VOICE_ID,
): string {
  return buildPgaContestCommentaryPrompt({
    context: context as Parameters<typeof buildPgaContestCommentaryPrompt>[0]["context"],
    voiceId,
    ...(correctiveFeedback ? { correctiveFeedback } : {}),
    minWords: COMMENTARY_MIN_WORDS,
    maxWords: COMMENTARY_MAX_WORDS,
  });
}

export function buildCommoditiesContestCommentaryPromptForSport(
  context: unknown,
  correctiveFeedback?: string,
  voiceId: ContestCommentaryVoiceId = DEFAULT_CONTEST_COMMENTARY_VOICE_ID,
): string {
  return buildCommoditiesContestCommentaryPrompt({
    context: context as Parameters<
      typeof buildCommoditiesContestCommentaryPrompt
    >[0]["context"],
    voiceId,
    ...(correctiveFeedback ? { correctiveFeedback } : {}),
    minWords: COMMENTARY_MIN_WORDS,
    maxWords: COMMENTARY_MAX_WORDS,
  });
}

export function buildContestCommentaryPromptForContext(
  context: ContestCommentaryPromptContext,
  correctiveFeedback?: string,
  voiceId: ContestCommentaryVoiceId = DEFAULT_CONTEST_COMMENTARY_VOICE_ID,
): string {
  if (isCommoditiesContext(context)) {
    return buildCommoditiesContestCommentaryPromptForSport(
      context,
      correctiveFeedback,
      voiceId,
    );
  }
  return buildGolfContestCommentaryPrompt(context, correctiveFeedback, voiceId);
}
