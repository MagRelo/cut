import { describe, expect, it } from "vitest";
import {
  chooseOddsBoard,
  parseDecimalOdds,
  parseLiveOddsPayload,
  parsePreTournamentOddsPayload,
} from "./eventOdds.js";

const live = {
  info: {
    current_round: 2,
    dead_heat_rules: "yes",
    event_name: "The RSM Classic",
    last_update: "2026-11-20 4:57 PM",
  },
  data: [
    {
      player_name: "Thorbjornsen, Michael",
      country: "USA",
      dg_id: 26649,
      win: 6.74,
      top_5: 2.3,
      top_10: 1.6,
    },
    {
      player_name: "James, Ben",
      country: "USA",
      dg_id: 29827,
      win: 24.05,
      top_5: 6.39,
      top_10: 3.88,
    },
  ],
};

const pre = {
  event_name: "The RSM Classic",
  last_updated: "2026-11-17 21:23:34 UTC",
  dead_heats: "yes",
  baseline_history_fit: [
    {
      player_name: "James, Ben",
      country: "USA",
      dg_id: 29827,
      win: 24.05,
      top_5: 6.39,
      top_10: 3.88,
    },
  ],
};

describe("parseDecimalOdds", () => {
  it("keeps a positive decimal and drops a missing price", () => {
    expect(parseDecimalOdds(6.74)).toBe(6.74);
    expect(parseDecimalOdds("24.05")).toBe(24.05);
    expect(parseDecimalOdds(null)).toBeNull();
    expect(parseDecimalOdds(0)).toBeNull();
  });
});

describe("parseLiveOddsPayload", () => {
  it("reads decimal win, top 5, and top 10 with dead heat", () => {
    const board = parseLiveOddsPayload(live);
    expect(board?.source).toBe("live");
    expect(board?.deadHeats).toBe(true);
    expect(board?.updatedAt).toBe("2026-11-20 4:57 PM");
    expect(board?.players[0]).toMatchObject({
      displayName: "Michael Thorbjornsen",
      dgId: 26649,
      win: 6.74,
      top5: 2.3,
      top10: 1.6,
    });
    expect(board?.players[1]?.win).toBe(24.05);
  });
});

describe("parsePreTournamentOddsPayload", () => {
  it("reads the course-fit model", () => {
    const board = parsePreTournamentOddsPayload(pre);
    expect(board?.source).toBe("pre-tournament");
    expect(board?.deadHeats).toBe(true);
    expect(board?.players).toHaveLength(1);
    expect(board?.players[0]?.displayName).toBe("Ben James");
  });
});

describe("chooseOddsBoard", () => {
  it("prefers a live board for this event", () => {
    const liveBoard = parseLiveOddsPayload(live);
    const preBoard = parsePreTournamentOddsPayload(pre);
    expect(chooseOddsBoard("The RSM Classic", liveBoard, preBoard)?.source).toBe("live");
  });

  it("uses the course-fit board when live is a different event", () => {
    const liveBoard = parseLiveOddsPayload({
      ...live,
      info: { ...live.info, event_name: "Sony Open in Hawaii" },
    });
    const preBoard = parsePreTournamentOddsPayload(pre);
    expect(chooseOddsBoard("RSM Classic", liveBoard, preBoard)?.source).toBe("pre-tournament");
  });

  it("rejects a board for a different tournament", () => {
    const preBoard = parsePreTournamentOddsPayload(pre);
    expect(chooseOddsBoard("RBC Heritage", null, preBoard)).toBeNull();
  });
});
