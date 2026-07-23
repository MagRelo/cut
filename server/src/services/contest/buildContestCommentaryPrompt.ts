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

export function buildContestCommentaryPrompt(
  context: ContestCommentaryContext,
  correctiveFeedback?: string,
  voiceId: ContestCommentaryVoiceId = DEFAULT_CONTEST_COMMENTARY_VOICE_ID,
): string {
  return buildPgaContestCommentaryPrompt({
    context,
    voiceId,
    ...(correctiveFeedback ? { correctiveFeedback } : {}),
    minWords: COMMENTARY_MIN_WORDS,
    maxWords: COMMENTARY_MAX_WORDS,
  });
}
