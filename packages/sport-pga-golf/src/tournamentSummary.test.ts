import { describe, expect, it } from "vitest";
import {
  formatEventCourseLine,
  getEventBlurb,
  getNormalizedQuotes,
  isEventBlurbSection,
  isQuotesSection,
  normalizeHexColor,
  parseSummarySections,
  quoteColorsFromHex,
} from "./tournamentSummary.js";

describe("tournamentSummary", () => {
  it("recognizes quote section titles", () => {
    expect(isQuotesSection({ title: "From the 19th hole", items: [{ body: "x" }] })).toBe(true);
    expect(isQuotesSection({ title: "They Out Here Sayin", items: [{ body: "x" }] })).toBe(true);
    expect(isQuotesSection({ title: "Summary", items: [{ body: "x" }] })).toBe(true);
    expect(isQuotesSection({ title: "Best Players and Odds", items: [{ body: "x" }] })).toBe(
      false,
    );
  });

  it("recognizes Event Blurb and legacy Tournament History", () => {
    expect(isEventBlurbSection({ title: "Event Blurb", items: [{ body: "x" }] })).toBe(true);
    expect(isEventBlurbSection({ title: "Tournament History", items: [{ body: "x" }] })).toBe(
      true,
    );
    expect(isEventBlurbSection({ title: "Course and Format", items: [{ body: "x" }] })).toBe(
      false,
    );
  });

  it("joins Event Blurb bodies into announcement prose", () => {
    const sections = parseSummarySections([
      {
        title: "Event Blurb",
        items: [{ body: "First sentence." }],
      },
    ]);
    expect(getEventBlurb(sections)).toBe("First sentence.");

    const legacy = parseSummarySections([
      {
        title: "Tournament History",
        items: [{ body: "A." }, { body: "B." }],
      },
    ]);
    expect(getEventBlurb(legacy)).toBe("A. B.");
  });

  it("formats course · place lines", () => {
    expect(formatEventCourseLine("TPC Twin Cities", "Blaine", "Minnesota")).toBe(
      "TPC Twin Cities · Blaine, Minnesota",
    );
  });

  it("derives quote block colors from hex", () => {
    const colors = quoteColorsFromHex("#00abb8");
    expect(colors.border).toBe("#00abb8");
    expect(colors.bg).toBe("#e6f7f8");
    expect(colors.text).toBe("#005e65");
  });

  it("normalizes multi-quote items with defaults", () => {
    const sections = parseSummarySections([
      {
        title: "They Out Here Sayin",
        items: [
          { body: "CutBot take." },
          {
            body: "User take.",
            attribution: "Anthony Kim's Nose",
            color: "#00abb8",
          },
        ],
      },
    ]);

    const quotes = getNormalizedQuotes(sections);
    expect(quotes).toHaveLength(2);
    expect(quotes[0]?.attribution).toBe("CutBot");
    expect(quotes[0]?.color).toBe("#3b82f6");
    expect(quotes[1]?.attribution).toBe("Anthony Kim's Nose");
    expect(quotes[1]?.colors.border).toBe("#00abb8");
  });

  it("rejects invalid hex colors", () => {
    expect(normalizeHexColor("blue")).toBeNull();
    expect(normalizeHexColor("#abc")).toBeNull();
  });
});
