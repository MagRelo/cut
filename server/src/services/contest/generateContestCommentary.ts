import type { ContestCommentaryVoiceId } from "@cut/sport-sdk";
import type { ContestCommentaryContext } from "@cut/sport-pga-golf";
import {
  buildContestCommentaryContext,
  type BuildContestCommentaryContextOptions,
  type BuiltContestCommentaryContext,
  type ContestCommentaryDiagnostics,
} from "./buildContestCommentaryContext.js";
import {
  buildContestCommentaryPrompt,
  COMMENTARY_MAX_WORDS,
  COMMENTARY_MIN_WORDS,
} from "./buildContestCommentaryPrompt.js";
import {
  CursorCommentaryTextGenerator,
  type CommentaryTextGenerator,
} from "./commentaryTextGenerator.js";

export interface GenerateContestCommentaryOptions {
  analysis?: BuildContestCommentaryContextOptions;
  voiceId?: ContestCommentaryVoiceId;
  generator?: CommentaryTextGenerator;
  cursor?: {
    apiKey?: string;
    model?: string;
    cwd?: string;
  };
  now?: () => Date;
  contextBuilder?: (
    contestId: string,
    options?: BuildContestCommentaryContextOptions,
  ) => Promise<BuiltContestCommentaryContext>;
}

export interface GeneratedContestCommentary {
  schemaVersion: 1;
  generatedAt: string;
  commentary: string;
  context: ContestCommentaryContext;
  diagnostics: ContestCommentaryDiagnostics;
}

export function commentaryWordCount(value: string): number {
  return value.trim() ? value.trim().split(/\s+/u).length : 0;
}

function invalidCommentaryReason(value: string): string | null {
  const count = commentaryWordCount(value);
  if (count === 0) return "The output was empty.";
  if (count < COMMENTARY_MIN_WORDS || count > COMMENTARY_MAX_WORDS) {
    return `The output was ${count} words; it must be ${COMMENTARY_MIN_WORDS}-${COMMENTARY_MAX_WORDS} words.`;
  }
  return null;
}

function defaultGenerator(
  options: GenerateContestCommentaryOptions,
): CommentaryTextGenerator {
  const apiKey = options.cursor?.apiKey ?? process.env.CURSOR_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error(
      "CURSOR_API_KEY is required when no CommentaryTextGenerator is provided",
    );
  }
  return new CursorCommentaryTextGenerator({
    apiKey,
    ...(options.cursor?.model ? { model: options.cursor.model } : {}),
    ...(options.cursor?.cwd ? { cwd: options.cursor.cwd } : {}),
  });
}

export async function generateContestCommentary(
  contestId: string,
  options: GenerateContestCommentaryOptions = {},
): Promise<GeneratedContestCommentary> {
  const contextBuilder = options.contextBuilder ?? buildContestCommentaryContext;
  const built = await contextBuilder(contestId, options.analysis ?? {});
  const generator = options.generator ?? defaultGenerator(options);

  let commentary = await generator.generate(
    buildContestCommentaryPrompt(built.context, undefined, options.voiceId),
  );
  let invalidReason = invalidCommentaryReason(commentary);
  if (invalidReason) {
    commentary = await generator.generate(
      buildContestCommentaryPrompt(
        built.context,
        invalidReason,
        options.voiceId,
      ),
    );
    invalidReason = invalidCommentaryReason(commentary);
  }
  if (invalidReason) {
    throw new Error(
      `Contest commentary remained invalid after one retry: ${invalidReason}`,
    );
  }

  return {
    schemaVersion: 1,
    generatedAt: (options.now ?? (() => new Date()))().toISOString(),
    commentary: commentary.trim(),
    context: built.context,
    diagnostics: built.diagnostics,
  };
}
