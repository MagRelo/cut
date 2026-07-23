import { describe, expect, it } from "vitest";
import type { ContestCommentaryContext } from "./contestCommentary.js";
import { buildPgaContestCommentaryPrompt } from "./contestCommentaryPrompt.js";

const baseContext: ContestCommentaryContext = {
  period: 4,
  paidCount: 1,
  eventProgress: {
    period: 4,
    stageId: "final_round",
    leaderProgress: {
      holesRemaining: 4,
      pace: "closing",
      leaderParticipantIds: ["g1"],
      leaderNames: ["Golfer One"],
    },
  },
  race: { leaderScore: 10, cutScore: 10, contenderCount: 1 },
  contentionLineups: [],
  lineupRoutes: [],
  sharedDependencies: [],
  sharedDownsideRisks: [],
  highLeveragePlayers: [],
  highRarityLineups: [],
  consensusPlayers: [],
  uncertaintyNotes: [],
  simulation: { count: 100, seed: 1, popularityWeight: 0 },
};

describe("buildPgaContestCommentaryPrompt", () => {
  it("selects stage instructions from eventProgress.stageId", () => {
    const finalPrompt = buildPgaContestCommentaryPrompt({
      context: baseContext,
      minWords: 125,
      maxWords: 175,
    });
    expect(finalPrompt).toContain("Stage: final round");
    expect(finalPrompt).toContain("eventProgress.leaderProgress");
    expect(finalPrompt).toContain("Treat route metrics as analytical guidance");

    const openingPrompt = buildPgaContestCommentaryPrompt({
      context: {
        ...baseContext,
        period: 1,
        eventProgress: { period: 1, stageId: "opening_round" },
      },
      minWords: 125,
      maxWords: 175,
    });
    expect(openingPrompt).toContain("Stage: opening round");
    expect(openingPrompt).toContain("Wave tee times");
    expect(openingPrompt).toContain("highLeveragePlayers");
    expect(openingPrompt).not.toContain("Stage: final round");
    expect(openingPrompt).not.toContain("prioritize routes to winning");
    expect(openingPrompt).not.toContain("Treat route metrics as analytical guidance");
  });

  it("includes corrective feedback when provided", () => {
    const prompt = buildPgaContestCommentaryPrompt({
      context: baseContext,
      correctiveFeedback: "The output was 10 words; it must be 125-175 words.",
      minWords: 125,
      maxWords: 175,
    });
    expect(prompt).toContain("Correction required after the previous attempt");
    expect(prompt).toContain("125-175 words");
  });
});
