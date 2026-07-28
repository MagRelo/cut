import {
  DEFAULT_CONTEST_COMMENTARY_VOICE_ID,
  type ContestCommentaryVoiceId,
} from "@cut/sport-sdk";
import {
  buildContestCommentaryPromptForContext,
  COMMENTARY_MAX_WORDS,
  COMMENTARY_MIN_WORDS,
  type ContestCommentaryPromptContext,
} from "../../sports/commentaryPrompts.js";

export {
  COMMENTARY_MAX_WORDS,
  COMMENTARY_MIN_WORDS,
  type ContestCommentaryPromptContext,
};

export function buildContestCommentaryPrompt(
  context: ContestCommentaryPromptContext,
  correctiveFeedback?: string,
  voiceId: ContestCommentaryVoiceId = DEFAULT_CONTEST_COMMENTARY_VOICE_ID,
): string {
  return buildContestCommentaryPromptForContext(
    context,
    correctiveFeedback,
    voiceId,
  );
}
