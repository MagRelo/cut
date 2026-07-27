import { describe, expect, it } from "vitest";
import {
  analyzeCommoditiesContestCommentary,
  dayLabelForPeriod,
  resolveCommoditiesCommentaryStage,
  resolveSettledPeriodFromScoreData,
} from "./contestCommentary.js";
import { buildCommoditiesContestCommentaryPrompt } from "./contestCommentaryPrompt.js";

function entry(
  id: string,
  displayName: string,
  picks: string[],
  createdAt = new Date(`2026-01-0${id.length}T00:00:00Z`),
) {
  return {
    entryId: id,
    displayName,
    prediction: { type: "winningLineupTotal", value: 40 },
    createdAt,
    eventParticipantIds: picks,
  };
}

function round(total: number, pctReturn: number, provisional = false) {
  return { total, pctReturn, provisional };
}

function participant(
  id: string,
  displayName: string,
  total: number,
  rounds: Array<ReturnType<typeof round> | null>,
) {
  const scoreData: Record<string, unknown> = {};
  rounds.forEach((value, index) => {
    if (value) scoreData[`r${index + 1}`] = value;
  });
  return {
    eventParticipantId: id,
    displayName,
    total,
    scoreData,
  };
}

describe("resolveSettledPeriodFromScoreData", () => {
  it("returns highest fully settled round", () => {
    const participants = [
      participant("gold", "Gold", 12, [
        round(10, 1),
        round(2, 0.2),
        round(5, 0.5, true),
      ]),
      participant("oil", "Crude Oil", 8, [
        round(4, 0.4),
        round(4, 0.4),
        round(-1, -0.25, true),
      ]),
    ];
    expect(resolveSettledPeriodFromScoreData(participants)).toBe(2);
  });

  it("returns 0 when nothing has settled", () => {
    expect(
      resolveSettledPeriodFromScoreData([
        participant("gold", "Gold", 3, [round(3, 0.3, true)]),
      ]),
    ).toBe(0);
  });
});

describe("resolveCommoditiesCommentaryStage", () => {
  it("maps settled periods to stages", () => {
    expect(resolveCommoditiesCommentaryStage(1)).toBe("opening_day");
    expect(resolveCommoditiesCommentaryStage(2)).toBe("midweek");
    expect(resolveCommoditiesCommentaryStage(3)).toBe("midweek");
    expect(resolveCommoditiesCommentaryStage(4)).toBe("late_week");
    expect(resolveCommoditiesCommentaryStage(5)).toBe("final_day");
    expect(resolveCommoditiesCommentaryStage(null)).toBe("unknown");
  });

  it("labels weekdays", () => {
    expect(dayLabelForPeriod(1)).toBe("Mon");
    expect(dayLabelForPeriod(5)).toBe("Fri");
    expect(dayLabelForPeriod(null)).toBeNull();
  });
});

describe("analyzeCommoditiesContestCommentary", () => {
  it("builds race, day movers, and ownership context", () => {
    const entries = [
      entry("a", "Alex", ["gold", "oil", "silver"]),
      entry("b", "Blake", ["gold", "copper", "gas"]),
      entry("c", "Casey", ["oil", "silver", "gas"]),
    ];
    const participants = [
      participant("gold", "Gold", 20, [round(12, 1.2), round(8, 0.8)]),
      participant("oil", "Crude Oil", 5, [round(10, 1), round(-5, -1.25)]),
      participant("silver", "Silver", 6, [round(2, 0.2), round(4, 0.4)]),
      participant("copper", "Copper", 3, [round(1, 0.1), round(2, 0.2)]),
      participant("gas", "Natural Gas", -4, [round(-2, -0.5), round(-2, -0.5)]),
    ];

    const context = analyzeCommoditiesContestCommentary({
      contestId: "contest-1",
      eventId: "event-1",
      externalId: "2026-W27",
      currentPeriod: 2,
      settledPeriod: 2,
      paidCount: 2,
      entries,
      participants,
      pickRates: {
        gold: 2 / 3,
        oil: 2 / 3,
        silver: 2 / 3,
        copper: 1 / 3,
        gas: 2 / 3,
      },
    });

    expect(context.settledPeriod).toBe(2);
    expect(context.eventProgress).toMatchObject({
      stageId: "midweek",
      dayLabel: "Tue",
      roundsRemaining: 3,
    });
    expect(context.race.leaderScore).toBeGreaterThanOrEqual(context.race.cutScore);
    expect(context.contentionLineups[0]?.positionNow).toBe(1);
    expect(context.dayMovers[0]?.eventParticipantId).toBe("gold");
    expect(context.dayMovers.some((mover) => mover.eventParticipantId === "oil")).toBe(
      true,
    );
    expect(context.consensusPicks.some((pick) => pick.eventParticipantId === "gold")).toBe(
      true,
    );
    expect(context.sharedPicks.length).toBeGreaterThan(0);
  });

  it("derives settled period from scoreData when omitted", () => {
    const context = analyzeCommoditiesContestCommentary({
      contestId: "contest-1",
      eventId: "event-1",
      paidCount: 1,
      entries: [entry("a", "Alex", ["gold"])],
      participants: [
        participant("gold", "Gold", 10, [round(10, 1), round(0, 0, true)]),
      ],
    });
    expect(context.settledPeriod).toBe(1);
    expect(context.eventProgress.stageId).toBe("opening_day");
  });
});

describe("buildCommoditiesContestCommentaryPrompt", () => {
  it("includes voice, stage, and context JSON", () => {
    const context = analyzeCommoditiesContestCommentary({
      contestId: "contest-1",
      eventId: "event-1",
      settledPeriod: 1,
      paidCount: 1,
      entries: [entry("a", "Alex", ["gold"])],
      participants: [participant("gold", "Gold", 10, [round(10, 1)])],
    });
    const prompt = buildCommoditiesContestCommentaryPrompt({
      context,
      minWords: 125,
      maxWords: 175,
      voiceId: "looseSportscast",
    });
    expect(prompt).toContain("125-175 words");
    expect(prompt).toContain("settled Mon trading session");
    expect(prompt).toContain("CONTEST_CONTEXT_JSON=");
    expect(prompt).toContain("opening trading day");
  });
});
