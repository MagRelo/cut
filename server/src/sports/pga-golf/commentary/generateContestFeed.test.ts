import { describe, expect, it } from "vitest";
import {
  commentaryFeedWordCount,
  generateContestFeed,
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
    const valid = Array(125).fill("word").join(" ");
    const generator = new SequenceGenerator([valid]);

    const result = await generateContestFeed("contest", {
      generator,
      contextBuilder: builder,
      existingFeed: { schemaVersion: 1, items: [] },
      now: () => new Date("2026-07-18T12:00:00.000Z"),
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.storyType).toBe("stage_recap");
    expect(result.newItems).toHaveLength(1);
    expect(commentaryFeedWordCount(result.newItems[0]!.text)).toBe(125);
    expect(result.newItems[0]?.round).toBe(4);
    expect(result.document.items[0]?.storyType).toBe("stage_recap");
    expect(result.document.items[0]?.round).toBe(4);
    expect(result.document.lastContext?.period).toBe(4);
    expect(result.document.lastHoleState).toEqual({});
    expect(generator.prompts[0]).toContain("Story: stage recap");
    expect(generator.prompts[0]).toContain("125-175 words");
  });

  it("retries invalid flash-length output for leverage stories", async () => {
    const previous = {
      ...context,
      highLeveragePlayers: [
        {
          eventParticipantId: "golfer",
          displayName: "Golfer",
          ownership: "50%",
          ownersCount: 1,
          cohortSize: 2,
          ownershipShare: 0.5,
          leverage: 0.1,
          payoutSwing: 0.2,
          holesLeft: 9,
          ownerEntryIds: ["one"],
          ownerNames: ["Alice"],
        },
      ],
    };
    const next = {
      ...previous,
      highLeveragePlayers: [
        {
          ...previous.highLeveragePlayers[0]!,
          leverage: 0.3,
        },
      ],
    };
    const valid = Array(50).fill("word").join(" ");
    const generator = new SequenceGenerator(["too short", valid]);

    const result = await generateContestFeed("contest", {
      generator,
      contextBuilder: () =>
        Promise.resolve({ context: next, diagnostics, contestPlayers: [] }),
      existingFeed: {
        schemaVersion: 1,
        items: [
          {
            id: "recent-recap",
            storyType: "stage_recap",
            priority: 40,
            subjects: {},
            text: "recent",
            generatedAt: "2026-07-18T11:50:00.000Z",
          },
        ],
        lastContext: previous,
      },
      now: () => new Date("2026-07-18T12:00:00.000Z"),
      maxPerPass: 1,
    });

    expect(result.newItems[0]?.storyType).toBe("leverage_spike");
    expect(generator.prompts).toHaveLength(2);
    expect(generator.prompts[1]).toContain("previous attempt");
  });
});
