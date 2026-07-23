import "dotenv/config";
import {
  buildContestCommentaryContext,
  type BuildContestCommentaryContextOptions,
} from "../services/contest/buildContestCommentaryContext.js";
import { generateContestCommentary } from "../services/contest/generateContestCommentary.js";
import {
  contestCommentaryVoices,
  type ContestCommentaryVoiceId,
} from "@cut/sport-sdk";
import { gracefulShutdown } from "../lib/prisma.js";

function finiteFlag(name: string, value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${name} requires a number`);
  return parsed;
}

export function parseContestCommentaryArgs(argv: string[]): {
  contestId: string;
  contextOnly: boolean;
  analysis: BuildContestCommentaryContextOptions;
  voiceId: ContestCommentaryVoiceId | undefined;
} {
  let contestId: string | undefined;
  let contextOnly = false;
  let voiceId: ContestCommentaryVoiceId | undefined;
  const analysis: BuildContestCommentaryContextOptions = {};

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]!;
    if (argument === "--context") {
      contextOnly = true;
    } else if (argument === "--voice") {
      const requestedVoice = argv[++index];
      if (
        !requestedVoice ||
        !(requestedVoice in contestCommentaryVoices)
      ) {
        throw new Error(
          `--voice must be one of: ${Object.keys(contestCommentaryVoices).join(", ")}`,
        );
      }
      voiceId = requestedVoice as ContestCommentaryVoiceId;
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
      "Usage: script:contest-commentary <contestId> [--voice name] [--context] [--simulations n] [--seed n] [--weight n]",
    );
  }
  return { contestId, contextOnly, analysis, voiceId };
}

async function main(): Promise<void> {
  const { contestId, contextOnly, analysis, voiceId } =
    parseContestCommentaryArgs(
    process.argv.slice(2),
  );
  if (contextOnly) {
    const built = await buildContestCommentaryContext(contestId, analysis);
    console.log(JSON.stringify(built, null, 2));
    return;
  }
  const result = await generateContestCommentary(contestId, {
    analysis,
    ...(voiceId ? { voiceId } : {}),
  });
  console.log(result.commentary);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(gracefulShutdown);
