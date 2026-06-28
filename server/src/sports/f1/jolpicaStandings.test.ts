import { describe, expect, it } from "vitest";
import { mapJolpicaStandingsByDriverNumber } from "./openf1Client.js";

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
