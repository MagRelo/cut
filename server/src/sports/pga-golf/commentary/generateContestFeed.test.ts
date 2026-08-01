import { describe, expect, it } from "vitest";
import {
  commentaryFeedWordCount,
  generateContestFeed,
  generateFeedItemsFromFrozenStories,
} from "./generateContestFeed.js";
import type { CommentaryTextGenerator } from "../../../services/contest/commentaryTextGenerator.js";

const context = {
  period: 4,
  paidCount: 3,
  eventProgress: {
    period: 4,
    stageId: "final_round",
    leaderProgress: {
      holesRemaining: 6,
      pace: "back_nine",
      leaderParticipantIds: ["golfer"],
      leaderNames: ["Golfer"],
    },
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
  return Promise.resolve({ context, diagnostics, contestPlayers: [] });
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

describe("generateContestFeed", () => {
  it("emits a stage_recap into a new feed document when no prior context exists", async () => {
    const valid = Array(150).fill("word").join(" ");
    const generator = new SequenceGenerator([valid]);

    const result = await generateContestFeed("contest", {
      generator,
      contextBuilder: builder,
      existingFeed: { schemaVersion: 1, items: [] },
      now: () => new Date("2026-07-18T12:00:00.000Z"),
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.storyType).toBe("stage_recap");
    expect(result.candidates[0]?.intensity).toBe("major");
    expect(result.newItems).toHaveLength(1);
    expect(commentaryFeedWordCount(result.newItems[0]!.text)).toBe(150);
    expect(result.newItems[0]?.round).toBe(4);
    expect(result.document.items[0]?.storyType).toBe("stage_recap");
    expect(result.document.items[0]?.round).toBe(4);
    expect(result.document.lastContext?.period).toBe(4);
    expect(result.document.lastHoleState).toEqual({});
    expect(generator.prompts[0]).toContain("Story: stage recap");
    expect(generator.prompts[0]).toContain("150-200 words");
    expect(generator.prompts[0]).toContain("Intensity: major");
    expect(generator.prompts[0]).toContain('Never write the word "leverage."');
  });

  it("retries invalid output for stage_recap stories", async () => {
    const previous = {
      ...context,
      period: 3,
      eventProgress: {
        period: 3,
        stageId: "weekend_move" as const,
        leaderProgress: {
          holesRemaining: 10,
          pace: "front_nine" as const,
          leaderParticipantIds: ["golfer"],
          leaderNames: ["Golfer"],
        },
      },
    };
    const valid = Array(125).fill("word").join(" ");
    const generator = new SequenceGenerator(["too short", valid]);

    const result = await generateContestFeed("contest", {
      generator,
      contextBuilder: () =>
        Promise.resolve({ context, diagnostics, contestPlayers: [] }),
      existingFeed: {
        schemaVersion: 1,
        items: [
          {
            id: "recent-recap",
            storyType: "stage_recap",
            priority: 40,
            subjects: {},
            text: "recent chaos vault surge",
            generatedAt: "2026-07-18T11:50:00.000Z",
          },
        ],
        lastContext: previous,
      },
      now: () => new Date("2026-07-18T12:00:00.000Z"),
      maxPerPass: 1,
    });

    expect(result.newItems[0]?.storyType).toBe("stage_recap");
    expect(result.candidates[0]?.intensity).toBe("notable");
    expect(generator.prompts).toHaveLength(2);
    expect(generator.prompts[0]).toContain("125-175 words");
    expect(generator.prompts[0]).toContain("RECENTLY_PUBLISHED");
    expect(generator.prompts[1]).toContain("previous attempt");
  });

  it("uses job period for round on the frozen path", async () => {
    const valid = Array(50).fill("word").join(" ");
    const generator = new SequenceGenerator([valid]);
    const result = await generateFeedItemsFromFrozenStories(
      "contest",
      [
        {
          candidate: {
            storyType: "score_swing",
            priority: 100,
            intensity: "notable",
            subjects: { participantIds: ["g1"] },
            subjectKey: "g1",
            reason: "birdie",
          },
          factPack: {
            storyType: "score_swing",
            stageId: "final_round",
            period: 4,
            paidCount: 3,
            events: [],
            impacts: [],
          },
        },
      ],
      {
        generator,
        existingFeed: {
          schemaVersion: 1,
          items: [],
          // Intentionally missing lastContext so period must come from options.
        },
        period: 3,
        now: () => new Date("2026-07-18T12:00:00.000Z"),
      },
    );

    expect(result.newItems[0]?.round).toBe(3);
    expect(generator.prompts[0]).toContain("45-75 words");
    expect(generator.prompts[0]).toContain("Intensity: notable");
    expect(generator.prompts[0]).toContain("Style:");
  });
});
