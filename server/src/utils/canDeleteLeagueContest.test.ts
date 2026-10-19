import { describe, expect, it } from "vitest";
import { canDeleteLeagueContest } from "./canDeleteLeagueContest.js";

const LEAGUE_ID = "league-1";

describe("canDeleteLeagueContest", () => {
  it("allows a free contest even when it has entries", () => {
    expect(
      canDeleteLeagueContest({
        userGroupId: LEAGUE_ID,
        status: "OPEN",
        primaryDeposit: 0,
        entryCount: 4,
      }),
    ).toBe(true);
  });

  it("allows a paid contest with no entries", () => {
    expect(
      canDeleteLeagueContest({
        userGroupId: LEAGUE_ID,
        status: "OPEN",
        primaryDeposit: 20,
        entryCount: 0,
      }),
    ).toBe(true);
  });

  it("blocks a paid contest that has entries", () => {
    expect(
      canDeleteLeagueContest({
        userGroupId: LEAGUE_ID,
        status: "OPEN",
        primaryDeposit: 20,
        entryCount: 1,
      }),
    ).toBe(false);
  });

  it("blocks a contest with a missing deposit", () => {
    expect(
      canDeleteLeagueContest({
        userGroupId: LEAGUE_ID,
        status: "OPEN",
        primaryDeposit: undefined,
        entryCount: 0,
      }),
    ).toBe(false);
  });

  it("blocks a public contest", () => {
    expect(
      canDeleteLeagueContest({
        userGroupId: null,
        status: "OPEN",
        primaryDeposit: 0,
        entryCount: 0,
      }),
    ).toBe(false);
  });

  it("blocks a contest that is no longer open", () => {
    expect(
      canDeleteLeagueContest({
        userGroupId: LEAGUE_ID,
        status: "ACTIVE",
        primaryDeposit: 0,
        entryCount: 0,
      }),
    ).toBe(false);
  });
});
