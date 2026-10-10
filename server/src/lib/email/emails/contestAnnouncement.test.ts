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
    memberCount: 12,
    buyInLabel: "$20",
    contestHref: "https://playthecut.com/contest/abc",
    announcement,
  };

  it("builds a league-scoped subject", () => {
    expect(contestAnnouncementSubject(data)).toBe("Sunday Swings: Charles Schwab Challenge");
  });

  it("includes league header, buy-in, announcement, and contest CTA", () => {
    const html = buildContestAnnouncementHtml(data);
    expect(html).toContain("New contest");
    expect(html).toContain("Sunday Swings");
    expect(html).toContain("League");
    expect(html).toContain("Members");
    expect(html).toContain("Buy-in");
    expect(html).toContain("12");
    expect(html).toContain("$20");
    expect(html).not.toContain("opened a contest");
    expect(html).not.toContain("New event available");
    expect(html).toContain("Charles Schwab Challenge");
    expect(html).toContain("A classic mid-week stop.");
    expect(html).toContain("Scottie Scheffler is the favorite.");
    expect(html).toContain("https://playthecut.com/contest/abc");
    expect(html).toContain("Open contest");
    expect(html).not.toContain("/contests");
    expect(html).not.toContain("CommodityBG3.png");
  });

  it("places a hero image above the event title when one is set", () => {
    const html = buildContestAnnouncementHtml({
      ...data,
      announcement: {
        ...announcement,
        headerImageUrl: "https://playthecut.com/CommodityBG3.png",
      },
    });
    const imageAt = html.indexOf("CommodityBG3.png");
    const titleAt = html.lastIndexOf("Charles Schwab Challenge");
    expect(imageAt).toBeGreaterThan(-1);
    expect(imageAt).toBeLessThan(titleAt);
    expect(html).toContain("height:176px");
  });

  it("bolds the week sign-off", () => {
    const html = buildContestAnnouncementHtml({
      ...data,
      announcement: {
        ...announcement,
        blurb:
          "A hurricane cancels a presidential football trip. Harry Styles takes over Madison Square Garden. And the Bills head to Los Angeles.\n\nThose stories—and a few surprises—this week on Planet Earth.",
      },
    });
    expect(html).toContain('<strong style="font-weight:700;">this week on Planet Earth.</strong>');
    expect(html).toContain("And the Bills head to Los Angeles.<br><br>Those stories");
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
