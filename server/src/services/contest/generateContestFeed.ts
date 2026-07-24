import {
  buildContestFeedFactPack,
  buildContestFeedHoleState,
  buildContestFeedItemId,
  buildPgaContestFeedPrompt,
  classifyContestFeedStories,
  mergeContestFeedItems,
  parseContestCommentaryFeedDocument,
  CONTEST_FEED_WORD_LIMITS,
  type ContestCommentaryFeedDocument,
  type ContestFeedItem,
  type ContestFeedStoryCandidate,
} from "@cut/sport-pga-golf";
import type { ContestCommentaryVoiceId } from "@cut/sport-sdk";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import {
  buildContestCommentaryContext,
  type BuildContestCommentaryContextOptions,
  type BuiltContestCommentaryContext,
  type ContestCommentaryDiagnostics,
} from "./buildContestCommentaryContext.js";
import {
  CursorCommentaryTextGenerator,
  type CommentaryTextGenerator,
} from "./commentaryTextGenerator.js";

export interface GenerateContestFeedOptions {
  analysis?: BuildContestCommentaryContextOptions;
  voiceId?: ContestCommentaryVoiceId;
  generator?: CommentaryTextGenerator;
  cursor?: {
    apiKey?: string;
    model?: string;
    cwd?: string;
  };
  now?: () => Date;
  /** Existing feed document; when omitted, loaded from Contest.commentaryFeed. */
  existingFeed?: ContestCommentaryFeedDocument | null;
  contextBuilder?: (
    contestId: string,
    options?: BuildContestCommentaryContextOptions,
  ) => Promise<BuiltContestCommentaryContext>;
  maxPerPass?: number;
}

export interface GeneratedContestFeed {
  schemaVersion: 1;
  generatedAt: string;
  document: ContestCommentaryFeedDocument;
  newItems: ContestFeedItem[];
  candidates: ContestFeedStoryCandidate[];
  context: BuiltContestCommentaryContext["context"];
  diagnostics: ContestCommentaryDiagnostics;
}

export function commentaryFeedWordCount(value: string): number {
  return value.trim() ? value.trim().split(/\s+/u).length : 0;
}

function invalidFeedTextReason(
  value: string,
  minWords: number,
  maxWords: number,
): string | null {
  const count = commentaryFeedWordCount(value);
  if (count === 0) return "The output was empty.";
  if (count < minWords || count > maxWords) {
    return `The output was ${count} words; it must be ${minWords}-${maxWords} words.`;
  }
  return null;
}

function defaultGenerator(
  options: GenerateContestFeedOptions,
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

async function loadExistingFeed(
  contestId: string,
): Promise<ContestCommentaryFeedDocument> {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { commentaryFeed: true },
  });
  return parseContestCommentaryFeedDocument(contest?.commentaryFeed);
}

async function generateStoryText(
  candidate: ContestFeedStoryCandidate,
  factPack: ReturnType<typeof buildContestFeedFactPack>,
  generator: CommentaryTextGenerator,
  voiceId: ContestCommentaryVoiceId | undefined,
): Promise<string> {
  const limits = CONTEST_FEED_WORD_LIMITS[candidate.storyType];
  const promptBase = {
    storyType: candidate.storyType,
    factPack,
    minWords: limits.minWords,
    maxWords: limits.maxWords,
    ...(voiceId != null ? { voiceId } : {}),
  };
  let text = await generator.generate(buildPgaContestFeedPrompt(promptBase));
  let invalidReason = invalidFeedTextReason(
    text,
    limits.minWords,
    limits.maxWords,
  );
  if (invalidReason) {
    text = await generator.generate(
      buildPgaContestFeedPrompt({
        ...promptBase,
        correctiveFeedback: invalidReason,
      }),
    );
    invalidReason = invalidFeedTextReason(
      text,
      limits.minWords,
      limits.maxWords,
    );
  }
  if (invalidReason) {
    throw new Error(
      `Contest feed ${candidate.storyType} remained invalid after one retry: ${invalidReason}`,
    );
  }
  return text.trim();
}

/**
 * Classify + generate typed feed items and merge into a feed document.
 * Does not modify Contest.commentary (legacy single snapshot).
 */
export async function generateContestFeed(
  contestId: string,
  options: GenerateContestFeedOptions = {},
): Promise<GeneratedContestFeed> {
  const contextBuilder = options.contextBuilder ?? buildContestCommentaryContext;
  const built = await contextBuilder(contestId, options.analysis ?? {});
  const existing =
    options.existingFeed !== undefined
      ? parseContestCommentaryFeedDocument(options.existingFeed)
      : await loadExistingFeed(contestId);
  const now = options.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const nowMs = Date.parse(generatedAt);
  const contestPlayers = built.contestPlayers ?? [];
  const previousHoleState = existing.lastHoleState ?? null;

  const candidates = classifyContestFeedStories(
    existing.lastContext,
    built.context,
    {
      existingItems: existing.items,
      nowMs,
      contestPlayers,
      previousHoleState,
      ...(options.maxPerPass != null ? { maxPerPass: options.maxPerPass } : {}),
    },
  );

  const generator =
    candidates.length > 0
      ? (options.generator ?? defaultGenerator(options))
      : null;

  const factPackOptions = {
    contestPlayers,
    previousHoleState,
  };

  const newItems: ContestFeedItem[] = [];
  for (const candidate of candidates) {
    const factPack = buildContestFeedFactPack(
      candidate,
      built.context,
      existing.lastContext,
      factPackOptions,
    );
    const text = await generateStoryText(
      candidate,
      factPack,
      generator!,
      options.voiceId,
    );
    newItems.push({
      id: buildContestFeedItemId(
        candidate.storyType,
        candidate.subjectKey,
        generatedAt,
        nowMs,
      ),
      storyType: candidate.storyType,
      priority: candidate.priority,
      subjects: candidate.subjects,
      text,
      generatedAt,
    });
  }

  const document = mergeContestFeedItems(existing, newItems, {
    updatedAt: generatedAt,
    lastContext: built.context,
    lastHoleState: buildContestFeedHoleState(contestPlayers),
  });

  return {
    schemaVersion: 1,
    generatedAt,
    document,
    newItems,
    candidates,
    context: built.context,
    diagnostics: built.diagnostics,
  };
}

export async function persistContestFeed(
  contestId: string,
  document: ContestCommentaryFeedDocument,
  generatedAt: string,
): Promise<void> {
  await prisma.contest.update({
    where: { id: contestId },
    data: {
      commentaryFeed: document as unknown as Prisma.InputJsonValue,
      commentaryFeedGeneratedAt: new Date(generatedAt),
    },
  });
}
