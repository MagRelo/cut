import { describe, expect, it } from "vitest";
import { defaultPayoutVector } from "@cut/sport-sdk";
import { requireSportModule } from "../../sports/registry.js";

function mockLineup(
  entryId: string,
  score: number,
  prediction: number,
  createdAt: Date,
) {
  return {
    entryId,
    score,
    createdAt,
    user: { name: "User", settings: {} },
    lineup: {
      name: "Lineup",
      prediction,
      picks: [],
    },
  };
}

function calculatePayoutBps(lineups: ReturnType<typeof mockLineup>[]) {
  const sportModule = requireSportModule("pga-golf");
  const ranked = sportModule.rankEntries(
    lineups.map((lineup) => ({
      entryId: lineup.entryId,
      score: lineup.score,
      prediction: lineup.lineup.prediction,
      createdAt: lineup.createdAt,
    })),
  );
  const payoutStructure =
    sportModule.derivePayoutVector?.(ranked, ranked.length) ??
    defaultPayoutVector(ranked.length);

  const payoutBps: number[] = [];
  for (const row of ranked) {
    const payout = payoutStructure[row.position - 1] ?? 0;
    if (payout > 0) {
      payoutBps.push(payout);
    }
  }
  return payoutBps;
}

describe("settlement payout assignment", () => {
  it("gives one full payout slot per position when scores tie (no split)", () => {
    const lineups = [
      mockLineup("1", 80, 100, new Date("2026-01-02")),
      mockLineup("2", 80, 95, new Date("2026-01-01")),
    ];
    const payouts = calculatePayoutBps(lineups);
    expect(payouts).toEqual([10000]);
    expect(payouts.reduce((a, b) => a + b, 0)).toBe(10000);
  });

  it("assigns distinct payouts for top three in large contests", () => {
    const lineups = Array.from({ length: 10 }, (_, i) =>
      mockLineup(String(i), 100 - i, 100 - i, new Date(`2026-01-${String(i + 1).padStart(2, "0")}`)),
    );
    const payouts = calculatePayoutBps(lineups);
    expect(payouts).toEqual([7000, 2000, 1000]);
    expect(payouts.reduce((a, b) => a + b, 0)).toBe(10000);
  });
});
