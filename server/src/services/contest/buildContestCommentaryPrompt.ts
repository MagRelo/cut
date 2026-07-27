import {
  buildCommoditiesContestCommentaryPrompt,
  type CommoditiesContestCommentaryContext,
} from "@cut/sport-commodities";
import {
  buildPgaContestCommentaryPrompt,
  type ContestCommentaryContext,
} from "@cut/sport-pga-golf";
import {
  DEFAULT_CONTEST_COMMENTARY_VOICE_ID,
  type ContestCommentaryVoiceId,
} from "@cut/sport-sdk";

export const COMMENTARY_MIN_WORDS = 125;
export const COMMENTARY_MAX_WORDS = 175;

export type ContestCommentaryPromptContext =
  | ContestCommentaryContext
  | CommoditiesContestCommentaryContext;

function isCommoditiesContext(
  context: ContestCommentaryPromptContext,
): context is CommoditiesContestCommentaryContext {
  return (
    "dayMovers" in context &&
    "eventProgress" in context &&
    typeof context.eventProgress === "object" &&
    context.eventProgress != null &&
    "dayLabel" in context.eventProgress
  );
}

export function buildContestCommentaryPrompt(
  context: ContestCommentaryPromptContext,
  correctiveFeedback?: string,
  voiceId: ContestCommentaryVoiceId = DEFAULT_CONTEST_COMMENTARY_VOICE_ID,
): string {
  if (isCommoditiesContext(context)) {
    return buildCommoditiesContestCommentaryPrompt({
      context,
      voiceId,
      ...(correctiveFeedback ? { correctiveFeedback } : {}),
      minWords: COMMENTARY_MIN_WORDS,
      maxWords: COMMENTARY_MAX_WORDS,
    });
  }

  return buildPgaContestCommentaryPrompt({
    context,
    voiceId,
    ...(correctiveFeedback ? { correctiveFeedback } : {}),
    minWords: COMMENTARY_MIN_WORDS,
    maxWords: COMMENTARY_MAX_WORDS,
  });
}
