import { describe, expect, it } from "vitest";
import {
  isQuotesSection,
  parseSummarySections,
  resolveSummarySectionsForEvent,
} from "./tournamentSummary.js";
import { renderSummarySectionsEmailHtml } from "./email/blocks/summary.js";

describe("resolveSummarySectionsForEvent", () => {
  it("prefers tournamentSummaries file over DB metadata", async () => {
    const fromDb = parseSummarySections([
      { title: "They Out Here Sayin", items: [{ body: "Stale DB copy." }] },
    ]);
    const resolved = await resolveSummarySectionsForEvent("R2026541", fromDb);
    const quotesSection = resolved?.find((section) => isQuotesSection(section));
    expect(quotesSection?.items[0]?.body).not.toBe("Stale DB copy.");
  });

  it("falls back to DB when no summary file exists", async () => {
    const fromDb = parseSummarySections([
      { title: "They Out Here Sayin", items: [{ body: "DB-only summary." }] },
    ]);
    const resolved = await resolveSummarySectionsForEvent("R9999999", fromDb);
    expect(resolved?.[0]?.items[0]?.body).toBe("DB-only summary.");
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
      isQuotesSection({ title: "They Out Here Sayin", items: [{ body: "Lead prose." }] }),
    ).toBe(true);
    expect(
      isQuotesSection({ title: "Key Storylines", items: [{ body: "x" }] }),
    ).toBe(false);
  });

  it("renders quote blocks from JSON items", () => {
    const html = renderSummarySectionsEmailHtml([
      {
        title: "They Out Here Sayin",
        items: [
          { body: "Opening paragraph text.", attribution: "CutBot", color: "#7cb68a" },
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
