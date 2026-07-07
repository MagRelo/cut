import { describe, expect, it } from "vitest";
import {
  getNormalizedQuotes,
  isQuotesSection,
  normalizeHexColor,
  parseSummarySections,
  quoteColorsFromHex,
} from "./tournamentSummary.js";

describe("tournamentSummary", () => {
  it("recognizes quote section titles", () => {
    expect(isQuotesSection({ title: "They Out Here Sayin", items: [{ body: "x" }] })).toBe(true);
    expect(isQuotesSection({ title: "Summary", items: [{ body: "x" }] })).toBe(true);
    expect(isQuotesSection({ title: "Best Players and Odds", items: [{ body: "x" }] })).toBe(
      false,
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
    expect(quotes[0]?.color).toBe("#7cb68a");
    expect(quotes[1]?.attribution).toBe("Anthony Kim's Nose");
    expect(quotes[1]?.colors.border).toBe("#00abb8");
  });

  it("rejects invalid hex colors", () => {
    expect(normalizeHexColor("blue")).toBeNull();
    expect(normalizeHexColor("#abc")).toBeNull();
  });
});
