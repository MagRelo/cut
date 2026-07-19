import { describe, expect, it } from "vitest";
import type { ContestCommentaryContext } from "@cut/sport-pga-golf";
import { buildContestCommentaryPrompt } from "./buildContestCommentaryPrompt.js";
import {
  commentaryWordCount,
  generateContestCommentary,
} from "./generateContestCommentary.js";
import type { CommentaryTextGenerator } from "./commentaryTextGenerator.js";

const context: ContestCommentaryContext = {
  period: 4,
  paidCount: 3,
  tournamentProgress: {
    round: 4,
    phase: "leaders_on_back_nine",
    leaderHolesRemaining: 6,
    leaderParticipantIds: ["golfer"],
    leaderNames: ["Golfer"],
  },
  race: { leaderScore: 100, cutScore: 80, contenderCount: 2 },
  contentionLineups: [
    {
      entryId: "one",
      displayName: "Alice",
      scoreNow: 100,
      positionNow: 1,
      gapToCut: 20,
      tier: "favorite",
      winProbability: 0.6,
      payoutProbability: 0.9,
    },
  ],
  lineupRoutes: [],
  sharedDependencies: [],
  sharedDownsideRisks: [],
  highLeveragePlayers: [],
  highRarityLineups: [],
  consensusPlayers: [],
  uncertaintyNotes: ["Simulation estimates are directional."],
  simulation: { count: 2000, seed: 2026, popularityWeight: 0 },
};

const diagnostics = {
  eventExternalId: "R2026033",
  contestStatus: "ACTIVE",
  entryCount: 2,
  fieldCount: 100,
  pickRatesLocked: true,
  calibration: { eventParticipantCount: 10, holeSampleCount: 720 },
  warnings: [],
  scoreDrift: [],
};

function builder() {
  return Promise.resolve({ context, diagnostics });
}

class SequenceGenerator implements CommentaryTextGenerator {
  readonly prompts: string[] = [];

  constructor(private readonly outputs: Array<string | Error>) {}

  async generate(prompt: string): Promise<string> {
    this.prompts.push(prompt);
    const output = this.outputs.shift();
    if (output instanceof Error) throw output;
    return output ?? "";
  }
}

describe("contest commentary generation", () => {
  it("constructs an output-only factual prompt from typed context", () => {
    const prompt = buildContestCommentaryPrompt(
      context,
      undefined,
      "shockJockSportscast",
    );

    expect(prompt).toContain("125-175 words");
    expect(prompt).toContain('"displayName":"Alice"');
    expect(prompt).toContain("shock-jock irreverence");
    expect(prompt).toContain("Treat route metrics as analytical guidance");
    expect(prompt).toContain("Return only the finished commentary");
    expect(prompt).toContain("Distinguish lineup rarity from lineup quality");
  });

  it("retries one invalid output and returns the valid commentary", async () => {
    const valid = Array(125).fill("word").join(" ");
    const generator = new SequenceGenerator(["too short", valid]);

    const result = await generateContestCommentary("contest", {
      generator,
      contextBuilder: builder,
      now: () => new Date("2026-07-18T12:00:00.000Z"),
    });

    expect(generator.prompts).toHaveLength(2);
    expect(generator.prompts[1]).toContain("previous attempt");
    expect(commentaryWordCount(result.commentary)).toBe(125);
    expect(result.generatedAt).toBe("2026-07-18T12:00:00.000Z");
  });

  it("fails clearly after one invalid retry", async () => {
    const generator = new SequenceGenerator(["short", "still short"]);

    await expect(
      generateContestCommentary("contest", {
        generator,
        contextBuilder: builder,
      }),
    ).rejects.toThrow("remained invalid after one retry");
    expect(generator.prompts).toHaveLength(2);
  });

  it("propagates provider and context errors", async () => {
    const providerError = new Error("provider unavailable");
    await expect(
      generateContestCommentary("contest", {
        generator: new SequenceGenerator([providerError]),
        contextBuilder: builder,
      }),
    ).rejects.toBe(providerError);

    const contextError = new Error("contest unavailable");
    await expect(
      generateContestCommentary("contest", {
        generator: new SequenceGenerator([]),
        contextBuilder: () => Promise.reject(contextError),
      }),
    ).rejects.toBe(contextError);
  });
});
