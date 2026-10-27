import { describe, expect, it } from "vitest";
import {
  eventNamesMatch,
  formatPlayerOddsLabel,
  matchOutrightsToEvent,
  parseDataGolfOutrightsPayload,
} from "./outrightOdds.js";

describe("parseDataGolfOutrightsPayload", () => {
  it("stamps the DataGolf baseline and keeps sportsbook quotes separate", () => {
    const board = parseDataGolfOutrightsPayload({
      event_name: "Charles Schwab Challenge",
      odds: [
        {
          player_name: "Scheffler, Scottie",
          draftkings: "+450",
          fanduel: "+500",
          bet365: "+475",
          datagolf: { baseline: "+420", baseline_history_fit: "+400" },
        },
        {
          player_name: "Morikawa, Collin",
          draftkings: "+1600",
        },
      ],
    });
    expect(board?.eventName).toBe("Charles Schwab Challenge");
    const scottie = board?.players.find((p) => p.displayName === "Scottie Scheffler");
    expect(scottie?.datagolf).toBe(420);
    expect(scottie?.quotes).toEqual(expect.arrayContaining([450, 500, 475]));
    expect(scottie?.quotes).not.toContain(420);
    expect(formatPlayerOddsLabel("Scottie Scheffler", scottie?.datagolf)).toBe(
      "Scottie Scheffler (+420):",
    );
    const collin = board?.players.find((p) => p.displayName === "Collin Morikawa");
    expect(collin?.datagolf).toBeNull();
    expect(formatPlayerOddsLabel("Collin Morikawa", collin?.datagolf)).toBe("Collin Morikawa:");
    expect(formatPlayerOddsLabel("Unknown", null)).toBe("Unknown:");
  });

  it("reads nested sportsbook odds objects", () => {
    const board = parseDataGolfOutrightsPayload({
      event_name: "RBC Heritage",
      odds: [
        {
          player_name: "Scheffler, Scottie",
          draftkings: { odds: 450 },
          fanduel: { price: 500 },
        },
      ],
    });
    const scottie = board?.players.find((p) => p.displayName === "Scottie Scheffler");
    expect(scottie?.quotes).toEqual(expect.arrayContaining([450, 500]));
  });
});

describe("matchOutrightsToEvent", () => {
  it("accepts matching names and rejects a different event board", () => {
    const board = parseDataGolfOutrightsPayload({
      event_name: "the Memorial Tournament presented by Workday",
      odds: [{ player_name: "Scheffler, Scottie", draftkings: 400 }],
    });
    expect(matchOutrightsToEvent(board, "the Memorial Tournament")).not.toBeNull();
    expect(eventNamesMatch("RBC Heritage", "RBC Heritage")).toBe(true);
    expect(matchOutrightsToEvent(board, "RBC Heritage")).toBeNull();
  });
});
