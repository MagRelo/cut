import { describe, expect, it } from "vitest";
import {
  buildPlayerWithdrawalHtml,
  playerWithdrawalSubject,
} from "./playerWithdrawal.js";

describe("playerWithdrawal email", () => {
  it("builds subject with tournament and player names", () => {
    expect(
      playerWithdrawalSubject({
        tournamentName: "The Masters",
        playerName: "Tiger Woods",
        lineupNames: ["Lineup #1"],
      }),
    ).toBe("The Masters — Tiger Woods withdrew");
  });

  it("includes lineup names and update CTA in html", () => {
    const html = buildPlayerWithdrawalHtml({
      tournamentName: "The Masters",
      playerName: "Tiger Woods",
      lineupNames: ["Lineup #1", "Lineup #2"],
    });

    expect(html).toContain("Tiger Woods");
    expect(html).not.toContain("Hi Matt");
    expect(html).toContain("Lineup #1");
    expect(html).toContain("Lineup #2");
    expect(html).toContain("/contests");
  });
});
