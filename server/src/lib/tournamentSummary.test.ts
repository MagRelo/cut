import { describe, expect, it } from "vitest";
import { isSummaryLeadSection, parseSummarySections } from "./tournamentSummary.js";
import { renderSummarySectionsEmailHtml } from "./email/blocks/summary.js";

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

  it("detects Summary lead section", () => {
    expect(
      isSummaryLeadSection({ title: "Summary", items: [{ body: "Lead prose." }] }),
    ).toBe(true);
    expect(
      isSummaryLeadSection({ title: "Key Storylines", items: [{ body: "x" }] }),
    ).toBe(false);
  });

  it("renders Summary section as paragraph without bullet", () => {
    const html = renderSummarySectionsEmailHtml([
      {
        title: "Summary",
        items: [{ label: "", body: "Opening paragraph text." }],
      },
      {
        title: "Best Players and Odds",
        items: [{ label: "Player:", body: "Odds note." }],
      },
    ]);
    expect(html).toContain("Opening paragraph text.");
    expect(html).not.toContain("&#8226;&nbsp;Opening paragraph");
    expect(html).toContain("border-left:3px solid");
    expect(html).toContain("font-style:italic");
    expect(html).toContain("&#8226;&nbsp;");
    expect(html).toContain("Best Players and Odds");
  });
});
