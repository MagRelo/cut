import { describe, expect, it } from "vitest";
import {
  isQuotesSection,
  parseSummarySections,
} from "@cut/sport-pga-golf";
import { resolveSummarySectionsForEvent } from "./tournamentSummaryIO.js";
import { createPgaGolfEmailContent } from "./emailContent.js";
import { renderSummarySectionsEmailHtml } from "../../lib/email/blocks/summary.js";

describe("resolveSummarySectionsForEvent", () => {
  it("prefers DB metadata over tournamentSummaries file", async () => {
    const fromDb = parseSummarySections([
      { title: "From the 19th Hole", items: [{ body: "DB copy wins." }] },
    ]);
    const resolved = await resolveSummarySectionsForEvent("R2026541", fromDb);
    expect(resolved?.[0]?.items[0]?.body).toBe("DB copy wins.");
  });

  it("falls back to file when DB has no summary", async () => {
    const resolved = await resolveSummarySectionsForEvent("R2026541", null);
    const quotesSection = resolved?.find((section) => isQuotesSection(section));
    expect(quotesSection?.items[0]?.body).toBeTruthy();
  });

  it("returns null when neither DB nor file has summary", async () => {
    const resolved = await resolveSummarySectionsForEvent("R9999999", null);
    expect(resolved).toBeNull();
  });
});

describe("parseSummarySections", () => {
  it("accepts valid summary JSON", () => {
    const parsed = parseSummarySections([
      {
        title: "Key Storylines",
        items: [{ label: "Venue:", body: "Test course." }],
      },
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed![0]!.title).toBe("Key Storylines");
  });

  it("rejects non-array", () => {
    expect(parseSummarySections({})).toBeNull();
  });

  it("rejects empty items", () => {
    expect(parseSummarySections([{ title: "X", items: [] }])).toBeNull();
  });

  it("rejects item without body", () => {
    expect(parseSummarySections([{ title: "X", items: [{ label: "A" }] }])).toBeNull();
  });

  it("detects quotes section", () => {
    expect(
      isQuotesSection({ title: "From the 19th Hole", items: [{ body: "Lead prose." }] }),
    ).toBe(true);
    expect(
      isQuotesSection({ title: "Key Storylines", items: [{ body: "x" }] }),
    ).toBe(false);
  });
});

describe("golf email announcement → summary HTML", () => {
  it("renders quote blocks from announcement sections", async () => {
    const adapter = createPgaGolfEmailContent();
    const content = await adapter.loadAnnouncementContent({
      externalId: "R9999999",
      name: "Test",
      course: "TPC",
      city: "Blaine",
      state: "MN",
      startDate: new Date("2026-05-22"),
      endDate: new Date("2026-05-25"),
      summarySections: [
        {
          title: "From the 19th Hole",
          items: [
            { body: "Opening paragraph text.", attribution: "CutBot", color: "#3b82f6" },
            {
              body: "Second hot take.",
              attribution: "Anthony Kim's Nose",
              color: "#00abb8",
            },
          ],
        },
        {
          title: "Best Players and Odds",
          items: [{ label: "Player:", body: "Odds note." }],
        },
      ],
    });

    const html = renderSummarySectionsEmailHtml([
      ...content.leadSections,
      ...content.bodySections,
    ]);
    expect(html).toContain("Opening paragraph text.");
    expect(html).toContain("Second hot take.");
    expect(html).not.toContain("&#8226;&nbsp;Opening paragraph");
    expect(html).toContain("border-left:3px solid");
    expect(html).toContain("font-style:italic");
    expect(html).toContain("&mdash; CutBot");
    expect(html).toContain("from the 19th hole:");
    expect(html).toContain("Anthony Kim's Nose");
    expect(html).toContain("&#8226;&nbsp;");
    expect(html).toContain("Best Players and Odds");
  });
});
