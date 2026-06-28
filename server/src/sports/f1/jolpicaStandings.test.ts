import { describe, expect, it } from "vitest";
import { mapJolpicaStandingsByDriverNumber, matchJolpicaRaceByDate } from "./openf1Client.js";
import type { JolpicaRace } from "./openf1Client.js";

describe("matchJolpicaRaceByDate", () => {
  const races: JolpicaRace[] = [
    {
      season: "2024",
      round: "11",
      raceName: "Austrian Grand Prix",
      date: "2024-06-30",
      Circuit: { circuitId: "red_bull_ring", circuitName: "Red Bull Ring" },
    },
    {
      season: "2024",
      round: "12",
      raceName: "British Grand Prix",
      date: "2024-07-07",
      Circuit: { circuitId: "silverstone", circuitName: "Silverstone" },
    },
  ];

  it("matches race by UTC calendar date", () => {
    const race = matchJolpicaRaceByDate(races, "2024-07-07");
    expect(race?.round).toBe("12");
    expect(race?.Circuit.circuitId).toBe("silverstone");
  });

  it("returns null when no race matches", () => {
    expect(matchJolpicaRaceByDate(races, "2024-08-01")).toBeNull();
  });
});

describe("mapJolpicaStandingsByDriverNumber", () => {
  it("maps permanentNumber to championship position and wins", () => {
    const map = mapJolpicaStandingsByDriverNumber([
      {
        position: "1",
        wins: "5",
        Driver: { permanentNumber: "12" },
      },
      {
        position: "2",
        wins: "1",
        Driver: { permanentNumber: "44" },
      },
    ]);

    expect(map.get(12)).toEqual({ championshipPosition: 1, seasonWins: 5 });
    expect(map.get(44)).toEqual({ championshipPosition: 2, seasonWins: 1 });
  });

  it("skips rows without a valid permanent number", () => {
    const map = mapJolpicaStandingsByDriverNumber([
      {
        position: "3",
        wins: "0",
        Driver: { permanentNumber: "not-a-number" },
      },
    ]);

    expect(map.size).toBe(0);
  });
});
