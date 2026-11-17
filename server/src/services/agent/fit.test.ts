import { describe, expect, it } from "vitest";
import { classifyScout, openAffordableCount, type ScoutInput } from "./fit.js";

function row(overrides: Partial<ScoutInput> = {}): ScoutInput {
  return {
    contestId: "contest-1",
    name: "Saturday",
    sportId: "pga-golf",
    chainId: 8453,
    status: "OPEN",
    userGroupId: "league-1",
    userGroupName: "Friends",
    primaryDeposit: 5,
    endTime: "2026-11-20T00:00:00.000Z",
    rosterSize: 4,
    predictionRange: { min: 1, max: 250 },
    fieldCount: 12,
    alreadyEntered: false,
    event: {
      id: "event-1",
      name: "The Cut",
      start: "2026-11-19T00:00:00.000Z",
      end: "2026-11-22T00:00:00.000Z",
      status: "SCHEDULED",
    },
    ...overrides,
  };
}

const now = new Date("2026-11-18T00:00:00.000Z");

function classify(
  rows: ScoutInput[],
  options: { balanceUsdc: number | null; maxEntryFee: number | null; sports: string[] },
) {
  return classifyScout(rows, { ...options, now });
}

describe("classifyScout", () => {
  it("tags an open league contest the balance can fund", () => {
    const result = classify([row()], {
      balanceUsdc: 12,
      maxEntryFee: 10,
      sports: [],
    });
    expect(result.blocked).toEqual([]);
    expect(result.contests[0]?.fit).toEqual([
      "open",
      "field-ready",
      "league",
      "affordable",
      "within-budget",
    ]);
    expect(result.contests[0]?.alreadyEntered).toBe(false);
    expect(openAffordableCount(result.contests)).toBe(1);
  });

  it("blocks a paid contest when the balance is short", () => {
    const result = classify([row({ primaryDeposit: 20 })], {
      balanceUsdc: 12,
      maxEntryFee: null,
      sports: [],
    });
    expect(result.contests).toEqual([]);
    expect(result.blocked).toEqual([
      { contestId: "contest-1", name: "Saturday", reason: "balance", primaryDeposit: 20 },
    ]);
  });

  it("keeps a paid contest visible when the balance read failed, without affordable", () => {
    const result = classify([row()], {
      balanceUsdc: null,
      maxEntryFee: null,
      sports: [],
    });
    expect(result.blocked).toEqual([]);
    expect(result.contests[0]?.fit).not.toContain("affordable");
    expect(openAffordableCount(result.contests)).toBe(0);
  });

  it("omits a contest that is no longer a choice", () => {
    const result = classify(
      [
        row({ contestId: "settled", status: "SETTLED", alreadyEntered: true }),
        row({ contestId: "live", event: { ...row().event, status: "LIVE" } }),
        row({ contestId: "ended", endTime: "2026-11-17T00:00:00.000Z" }),
        row({
          contestId: "event-ended",
          event: { ...row().event, end: "2026-11-17T00:00:00.000Z" },
        }),
      ],
      { balanceUsdc: 12, maxEntryFee: null, sports: [] },
    );
    expect(result.contests).toEqual([]);
    expect(result.blocked).toEqual([]);
  });

  it("blocks an open entry the account already joined", () => {
    const result = classify([row({ alreadyEntered: true })], {
      balanceUsdc: 12,
      maxEntryFee: null,
      sports: [],
    });
    expect(result.blocked[0]?.reason).toBe("already-entered");
  });

  it("blocks an open contest with an empty field", () => {
    const result = classify([row({ fieldCount: 0 })], {
      balanceUsdc: 12,
      maxEntryFee: null,
      sports: [],
    });
    expect(result.blocked[0]?.reason).toBe("field-empty");
  });

  it("omits the within-budget tag when the fee is over the cap", () => {
    const result = classify([row({ primaryDeposit: 25 })], {
      balanceUsdc: 40,
      maxEntryFee: 10,
      sports: [],
    });
    expect(result.contests[0]?.fit).not.toContain("within-budget");
    expect(result.contests[0]?.fit).toContain("affordable");
  });

  it("drops sports outside the preference list", () => {
    const result = classify([row(), row({ contestId: "f1", sportId: "f1", name: "Race" })], {
      balanceUsdc: 40,
      maxEntryFee: null,
      sports: ["f1"],
    });
    expect(result.contests.map((contest) => contest.contestId)).toEqual(["f1"]);
    expect(result.blocked).toEqual([]);
  });
});
