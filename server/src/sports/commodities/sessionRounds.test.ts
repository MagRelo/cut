import { describe, expect, it } from "vitest";
import {
  commoditiesPeriodDisplay,
  commoditiesPeriodStatusDisplay,
  commoditiesRoundDisplay,
  commoditiesRoundStatusDisplay,
} from "./sessionRounds.js";

describe("commoditiesPeriodDisplay", () => {
  it("formats trading day label", () => {
    expect(commoditiesPeriodDisplay(1)).toBe("D1");
    expect(commoditiesPeriodDisplay(5)).toBe("D5");
    expect(commoditiesRoundDisplay(3)).toBe("D3");
  });
});

describe("commoditiesPeriodStatusDisplay", () => {
  it("shows day name while session is live", () => {
    expect(commoditiesPeriodStatusDisplay(1, false)).toBe("Mon session");
    expect(commoditiesRoundStatusDisplay(3, false)).toBe("Wed session");
  });

  it("shows week complete when settled", () => {
    expect(commoditiesPeriodStatusDisplay(5, true)).toBe("Week complete");
    expect(commoditiesRoundStatusDisplay(5, true)).toBe("Week complete");
  });
});
