import "dotenv/config";
import {
  classifyContestFeedStories,
  parseContestCommentaryFeedDocument,
  type ContestCommentaryFeedDocument,
} from "@cut/sport-pga-golf";
import {
  contestCommentaryVoices,
  type ContestCommentaryVoiceId,
} from "@cut/sport-sdk";
import { gracefulShutdown, prisma } from "../lib/prisma.js";
import {
  buildContestCommentaryContext,
  type BuildContestCommentaryContextOptions,
} from "../services/contest/buildContestCommentaryContext.js";
import {
  generateContestFeed,
  persistContestFeed,
} from "../services/contest/generateContestFeed.js";
import { publishContestFeedItemsToStream } from "../services/stream/publishContestFeedToStream.js";

function finiteFlag(name: string, value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${name} requires a number`);
  return parsed;
}

export function parseContestFeedArgs(argv: string[]): {
  contestId: string;
  classifyOnly: boolean;
  write: boolean;
  analysis: BuildContestCommentaryContextOptions;
  voiceId: ContestCommentaryVoiceId | undefined;
  maxPerPass: number | undefined;
} {
  let contestId: string | undefined;
  let classifyOnly = false;
  let write = false;
  let voiceId: ContestCommentaryVoiceId | undefined;
  let maxPerPass: number | undefined;
  const analysis: BuildContestCommentaryContextOptions = {};

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]!;
    if (argument === "--classify") {
      classifyOnly = true;
    } else if (argument === "--write") {
      write = true;
    } else if (argument === "--voice") {
      const requestedVoice = argv[++index];
      if (!requestedVoice || !(requestedVoice in contestCommentaryVoices)) {
        throw new Error(
          `--voice must be one of: ${Object.keys(contestCommentaryVoices).join(", ")}`,
        );
      }
      voiceId = requestedVoice as ContestCommentaryVoiceId;
    } else if (argument === "--max") {
      maxPerPass = finiteFlag(argument, argv[++index]);
    } else if (argument === "--simulations") {
      analysis.simulations = finiteFlag(argument, argv[++index]);
    } else if (argument === "--seed") {
      analysis.seed = finiteFlag(argument, argv[++index]);
    } else if (argument === "--weight") {
      analysis.popularityWeight = finiteFlag(argument, argv[++index]);
    } else if (!argument.startsWith("-") && !contestId) {
      contestId = argument;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!contestId) {
    throw new Error(
      "Usage: script:contest-feed <contestId> [--classify] [--write] [--voice name] [--max n] [--simulations n] [--seed n] [--weight n]",
    );
  }
  return { contestId, classifyOnly, write, analysis, voiceId, maxPerPass };
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

async function main(): Promise<void> {
  const { contestId, classifyOnly, write, analysis, voiceId, maxPerPass } =
    parseContestFeedArgs(process.argv.slice(2));

  if (classifyOnly) {
    const built = await buildContestCommentaryContext(contestId, analysis);
    const existing = await loadExistingFeed(contestId);
    const candidates = classifyContestFeedStories(
      existing.lastContext,
      built.context,
      {
        existingItems: existing.items,
        contestPlayers: built.contestPlayers,
        previousHoleState: existing.lastHoleState ?? null,
        ...(maxPerPass != null ? { maxPerPass } : {}),
      },
    );
    console.log(
      JSON.stringify(
        {
          candidates,
          existingItemCount: existing.items.length,
          diagnostics: built.diagnostics,
        },
        null,
        2,
      ),
    );
    return;
  }

  const result = await generateContestFeed(contestId, {
    analysis,
    ...(voiceId ? { voiceId } : {}),
    ...(maxPerPass != null ? { maxPerPass } : {}),
  });

  let streamPublish: { published: number; failed: number } | null = null;
  if (write) {
    await persistContestFeed(contestId, result.document, result.generatedAt);
    if (result.newItems.length > 0) {
      streamPublish = await publishContestFeedItemsToStream({
        contestId,
        items: result.newItems,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        written: write,
        generatedAt: result.generatedAt,
        candidates: result.candidates,
        newItems: result.newItems,
        itemCount: result.document.items.length,
        diagnostics: result.diagnostics,
        ...(streamPublish ? { streamPublish } : {}),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(gracefulShutdown);
