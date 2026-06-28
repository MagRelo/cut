import { describe, expect, it } from "vitest";
import {
  pointsForFinishPosition,
  transformProvisionalPosition,
  transformSessionResult,
} from "./live-scores.js";

describe("pointsForFinishPosition", () => {
  it.each([
    [1, 25],
    [5, 10],
    [10, 1],
    [11, 0],
    [0, 0],
  ] as const)("position %i → %i points", (position, expected) => {
    expect(pointsForFinishPosition(position)).toBe(expected);
  });
});

describe("transformProvisionalPosition", () => {
  it("marks score as provisional from running position", () => {
    const update = transformProvisionalPosition({ driverNumber: 44, position: 1 });
    expect(update.total).toBe(25);
    expect(update.scoreData).toMatchObject({
      position: 1,
      status: "running",
      finishPoints: 25,
      bonusPoints: 0,
      provisional: true,
    });
  });
});

describe("transformSessionResult", () => {
  it("uses API points including fastest-lap bonus", () => {
    const update = transformSessionResult({
      position: 5,
      driverNumber: 55,
      points: 11,
      dnf: false,
      dns: false,
      dsq: false,
    });
    expect(update.total).toBe(11);
    expect(update.scoreData).toMatchObject({
      position: 5,
      status: "finished",
      finishPoints: 10,
      bonusPoints: 1,
      fastestLap: true,
      provisional: false,
    });
  });

  it("returns zero points for DNF/DNS/DSQ", () => {
    expect(
      transformSessionResult({
        position: 8,
        driverNumber: 1,
        points: 0,
        dnf: true,
        dns: false,
        dsq: false,
      }).total,
    ).toBe(0);

    expect(
      transformSessionResult({
        position: 0,
        driverNumber: 2,
        points: 0,
        dnf: false,
        dns: true,
        dsq: false,
      }).scoreData.status,
    ).toBe("dns");
  });
});
