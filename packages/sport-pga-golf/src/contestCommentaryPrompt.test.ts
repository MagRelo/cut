import { describe, expect, it } from "vitest";
import type { ContestCommentaryContext } from "./contestCommentary.js";
import {
  buildPgaContestCommentaryPrompt,
  buildPgaContestFeedPrompt,
} from "./contestCommentaryPrompt.js";

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

    const cutPrompt = buildPgaContestCommentaryPrompt({
      context: {
        ...baseContext,
        period: 2,
        eventProgress: { period: 2, stageId: "cut_round" },
      },
      minWords: 125,
      maxWords: 175,
    });
    expect(cutPrompt).toContain("approaching the tournament cut");
    expect(cutPrompt).toContain("Never invent broadcast phrases");
    expect(cutPrompt).toContain("Do not echo internal stage labels");
    expect(cutPrompt).not.toContain("Stage: cut round");
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

  it("selects story instructions and word limits for feed prompts", () => {
    const swingPrompt = buildPgaContestFeedPrompt({
      storyType: "score_swing",
      factPack: {
        storyType: "score_swing",
        stageId: "final_round",
        period: 4,
        paidCount: 1,
        events: [],
        impacts: [],
      },
    });
    expect(swingPrompt).toContain("Story: score swing");
    expect(swingPrompt).toContain("event → result");
    expect(swingPrompt).toContain("position-bonus");
    expect(swingPrompt).toContain("first sentence must name the golfer");
    expect(swingPrompt).toContain("Do not open with Sunday framing");
    expect(swingPrompt).toContain("50-100 words");
    expect(swingPrompt).toContain("STORY_FACTS_JSON=");
    expect(swingPrompt).not.toContain("Stage: final round");
    expect(swingPrompt).not.toContain("Open by using eventProgress.leaderProgress");
    expect(swingPrompt).not.toContain("establish the current contest race");

    const leveragePrompt = buildPgaContestFeedPrompt({
      storyType: "leverage_spike",
      factPack: {
        storyType: "leverage_spike",
        stageId: "opening_round",
        period: 1,
        spikes: [],
        highLeveragePlayers: [],
        race: baseContext.race,
      },
    });
    expect(leveragePrompt).toContain("Story: leverage spike");
    expect(leveragePrompt).toContain("event → result");
    expect(leveragePrompt).toContain("40-80 words");
    expect(leveragePrompt).not.toContain("Stage: opening round");

    const recapPrompt = buildPgaContestFeedPrompt({
      storyType: "stage_recap",
      factPack: { storyType: "stage_recap", context: baseContext },
    });
    expect(recapPrompt).toContain("Story: stage recap");
    expect(recapPrompt).toContain("Stage: final round");
    expect(recapPrompt).toContain("Open by using eventProgress.leaderProgress");
    expect(recapPrompt).toContain("establish the current contest race");
  });
});
