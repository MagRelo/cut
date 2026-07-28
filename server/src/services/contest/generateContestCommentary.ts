import type { ContestCommentaryVoiceId } from "@cut/sport-sdk";
import { prisma } from "../../lib/prisma.js";
import {
  buildContestCommentaryContext,
  type BuildContestCommentaryContextOptions,
} from "../../sports/pga-golf/commentary/buildContestCommentaryContext.js";
import {
  buildCommoditiesContestCommentaryContext,
  type BuildCommoditiesContestCommentaryContextOptions,
} from "../../sports/commodities/commentary/buildCommoditiesContestCommentaryContext.js";
import { COMMODITIES_SPORT_ID } from "../../sports/commodities/sportId.js";
import { PGA_GOLF_SPORT_ID } from "../../sports/pga-golf/sportId.js";
import type { ContestCommentaryDiagnostics } from "./commentaryDiagnostics.js";
import {
  buildContestCommentaryPrompt,
  COMMENTARY_MAX_WORDS,
  COMMENTARY_MIN_WORDS,
  type ContestCommentaryPromptContext,
} from "./buildContestCommentaryPrompt.js";
import {
  CursorCommentaryTextGenerator,
  type CommentaryTextGenerator,
} from "./commentaryTextGenerator.js";

export type BuildAnyContestCommentaryContextOptions =
  BuildContestCommentaryContextOptions &
    BuildCommoditiesContestCommentaryContextOptions;

export interface GenerateContestCommentaryOptions {
  analysis?: BuildAnyContestCommentaryContextOptions;
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
    options?: BuildAnyContestCommentaryContextOptions,
  ) => Promise<{
    context: ContestCommentaryPromptContext;
    diagnostics: ContestCommentaryDiagnostics;
  }>;
}

export interface GeneratedContestCommentary {
  schemaVersion: 1;
  generatedAt: string;
  commentary: string;
  context: ContestCommentaryPromptContext;
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

async function defaultContextBuilder(
  contestId: string,
  options: BuildAnyContestCommentaryContextOptions = {},
): Promise<{
  context: ContestCommentaryPromptContext;
  diagnostics: ContestCommentaryDiagnostics;
}> {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { event: { select: { sportId: true } } },
  });
  if (!contest) throw new Error(`Contest not found: ${contestId}`);

  if (contest.event.sportId === COMMODITIES_SPORT_ID) {
    return buildCommoditiesContestCommentaryContext(contestId, options);
  }
  if (contest.event.sportId === PGA_GOLF_SPORT_ID) {
    return buildContestCommentaryContext(contestId, options);
  }
  throw new Error(
    `Contest commentary is not supported for sport ${contest.event.sportId}`,
  );
}

export async function generateContestCommentary(
  contestId: string,
  options: GenerateContestCommentaryOptions = {},
): Promise<GeneratedContestCommentary> {
  const contextBuilder = options.contextBuilder ?? defaultContextBuilder;
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
