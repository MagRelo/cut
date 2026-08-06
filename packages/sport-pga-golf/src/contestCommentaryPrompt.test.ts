import { describe, expect, it } from "vitest";
import type { ContestCommentaryContext } from "./contestCommentary.js";
import {
  buildPgaContestCommentaryPrompt,
  buildPgaContestFeedPrompt,
  selectContestFeedStyleDirective,
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
    expect(finalPrompt).toContain('Never write the word "leverage."');
    expect(finalPrompt).not.toMatch(/position, leverage, or paid-cut/);

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
    expect(openingPrompt).toContain("ownership edge");
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

  it("selects story instructions and intensity word limits for feed prompts", () => {
    const swingPrompt = buildPgaContestFeedPrompt({
      storyType: "score_swing",
      intensity: "routine",
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
    expect(swingPrompt).toContain("bonus_only");
    expect(swingPrompt).toContain("cause field");
    expect(swingPrompt).toContain("Dual storyline");
    expect(swingPrompt).toContain("ordinal holes");
    expect(swingPrompt).toContain("do not explain what a birdie/eagle/double is");
    expect(swingPrompt).toContain("Vary sentence structure across posts");
    expect(swingPrompt).toContain("gains/grabs/pockets/takes/picks up a contest spot");
    expect(swingPrompt).toContain("Intensity: routine");
    expect(swingPrompt).toContain("25-45 words");
    expect(swingPrompt).toContain("At most one numeric contest-score pair");
    expect(swingPrompt).toContain("Noodles #2");
    expect(swingPrompt).toContain("multiple paid spots");
    expect(swingPrompt).toContain("STORY_FACTS_JSON=");
    expect(swingPrompt).not.toContain("Hard-require opening");
    expect(swingPrompt).not.toContain("Stage: final round");
    expect(swingPrompt).not.toContain("Open by using eventProgress.leaderProgress");
    expect(swingPrompt).not.toContain("establish the current contest race");
    expect(swingPrompt).not.toContain("RECENTLY_PUBLISHED");

    const majorPrompt = buildPgaContestFeedPrompt({
      storyType: "score_swing",
      intensity: "major",
      styleSeed: "g1:2026-07-19T04:00:00.000Z",
      recentTexts: ["Old flash about chaos vaulting loud surge."],
      factPack: {
        storyType: "score_swing",
        stageId: "final_round",
        period: 4,
        paidCount: 1,
        events: [],
        impacts: [],
      },
    });
    expect(majorPrompt).toContain("Intensity: major");
    expect(majorPrompt).toContain("70-110 words");
    expect(majorPrompt).toContain("Style:");
    expect(majorPrompt).toContain("RECENTLY_PUBLISHED");
    expect(majorPrompt).toContain("same sentence skeleton");
    expect(majorPrompt).toContain("Old flash about chaos");

    const recapPrompt = buildPgaContestFeedPrompt({
      storyType: "stage_recap",
      factPack: { storyType: "stage_recap", context: baseContext },
    });
    expect(recapPrompt).toContain("Story: stage recap");
    expect(recapPrompt).toContain("Stage: final round");
    expect(recapPrompt).toContain("Open by using eventProgress.leaderProgress");
    expect(recapPrompt).toContain("establish the current contest race");
    expect(recapPrompt).toContain("125-175 words");
  });

  it("builds a tournament-only pulse prompt without contest narrative", () => {
    const pulsePrompt = buildPgaContestFeedPrompt({
      storyType: "tournament_pulse",
      intensity: "routine",
      styleSeed: "pulse:2026-07-19T04:00:00.000Z",
      recentTexts: ["Old tournament color about leaders on the back."],
      factPack: {
        storyType: "tournament_pulse",
        stageId: "final_round",
        period: 4,
        eventProgress: baseContext.eventProgress,
        tournamentBoard: [
          {
            eventParticipantId: "g1",
            displayName: "Golfer One",
            leaderboardPosition: "1",
            leaderboardTotal: "-8",
          },
        ],
      },
    });
    expect(pulsePrompt).toContain("Write one live tournament feed update");
    expect(pulsePrompt).toContain("Story: tournament pulse");
    expect(pulsePrompt).toContain("tournament color only");
    expect(pulsePrompt).toContain("Never mention contest standings");
    expect(pulsePrompt).toContain("40-70 words");
    expect(pulsePrompt).toContain("Intensity: routine");
    expect(pulsePrompt).toContain("RECENTLY_PUBLISHED");
    expect(pulsePrompt).toContain("STORY_FACTS_JSON=");
    expect(pulsePrompt).not.toContain("Dual storyline");
    expect(pulsePrompt).not.toContain("event → result");
    expect(pulsePrompt).not.toContain("At most one numeric contest-score pair");
    expect(pulsePrompt).not.toContain("Stage: final round");
    expect(pulsePrompt).not.toContain("establish the current contest race");
    expect(pulsePrompt).not.toContain("open on the owner's reaction");
  });

  it("selects a stable style directive for a seed", () => {
    const a = selectContestFeedStyleDirective("g1:t1");
    const b = selectContestFeedStyleDirective("g1:t1");
    const c = selectContestFeedStyleDirective("g2:t1");
    expect(a).toBe(b);
    expect(a).toContain("Style:");
    expect(a === c || a !== c).toBe(true);
  });
});
