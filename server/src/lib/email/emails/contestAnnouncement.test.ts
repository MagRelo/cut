import { describe, expect, it } from "vitest";
import type { EmailAnnouncementContent } from "@cut/sport-sdk";
import {
  buildContestAnnouncementHtml,
  contestAnnouncementSubject,
  contestLobbyHref,
} from "./contestAnnouncement.js";

const announcement: EmailAnnouncementContent = {
  courseLine: "Colonial Country Club · Fort Worth, Texas",
  dateLine: "May 21–May 24, 2026",
  blurb: "A classic mid-week stop.",
  leadSections: [],
  bodySections: [
    {
      key: "Best Players and Odds",
      title: "Best Players and Odds",
      kind: "bullets",
      items: [{ body: "Scottie Scheffler is the favorite." }],
    },
  ],
};

describe("contestAnnouncement email", () => {
  const data = {
    eventName: "Charles Schwab Challenge",
    leagueName: "Sunday Swings",
    buyInLabel: "$20",
    contestHref: "https://playthecut.com/contest/abc",
    announcement,
  };

  it("builds a league-scoped subject", () => {
    expect(contestAnnouncementSubject(data)).toBe("Sunday Swings: Charles Schwab Challenge");
  });

  it("includes league header, buy-in, announcement, and contest CTA", () => {
    const html = buildContestAnnouncementHtml(data);
    expect(html).toContain("Sunday Swings opened a contest");
    expect(html).toContain("Buy-in: $20");
    expect(html).toContain("Charles Schwab Challenge");
    expect(html).toContain("A classic mid-week stop.");
    expect(html).toContain("Scottie Scheffler is the favorite.");
    expect(html).toContain("https://playthecut.com/contest/abc");
    expect(html).toContain("Open contest");
    expect(html).not.toContain("/contests");
  });

  it("uses contest address for lobby href when present", () => {
    expect(
      contestLobbyHref({
        id: "cuid1",
        address: "0xABC1230000000000000000000000000000000000",
      }),
    ).toContain("/contest/0xabc1230000000000000000000000000000000000");
  });
});
