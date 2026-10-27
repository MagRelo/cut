import { describe, expect, it } from "vitest";
import { renderBodySummarySectionsHtml } from "./summary.js";

describe("renderBodySummarySectionsHtml", () => {
  it("puts a story headline on its own line above the paragraph", () => {
    const html = renderBodySummarySectionsHtml([
      {
        key: "Top Stories",
        title: "Top Stories",
        kind: "prose",
        items: [
          { label: "China credit", body: "Monday brings the credit figures. A soft print is a demand worry." },
          { label: "US CPI", body: "September CPI prints Wednesday. Gold trades it first." },
        ],
      },
    ]);

    expect(html).toContain("China credit");
    expect(html).toContain("Monday brings the credit figures.");
    expect(html).not.toContain("&#8226;");
    expect(html.indexOf("China credit")).toBeLessThan(html.indexOf("Monday brings the credit figures."));
    expect(html).toContain("border-top:1px solid #e4e4e7;");
  });

  it("keeps short labeled results on one bullet line", () => {
    const html = renderBodySummarySectionsHtml([
      {
        key: "Last week",
        title: "Last week",
        kind: "bullets",
        items: [{ label: "Natural Gas", body: "Best — +109 pts, +11.2% on the week" }],
      },
    ]);

    expect(html).toContain("&#8226;");
    expect(html).toContain("Natural Gas");
    expect(html).toContain("Best — +109 pts, +11.2% on the week");
  });

  it("lays a best-odds player out as avatar, name, price, then the blurb", () => {
    const html = renderBodySummarySectionsHtml([
      {
        key: "Best Players and Odds",
        title: "Best Players and Odds",
        kind: "bullets",
        items: [
          {
            label: "Scottie Scheffler (+450):",
            body: "The clear favorite on a course that suits him.",
            imageUrl: "https://images.example.com/scottie.jpg",
            subtitle: "United States",
          },
        ],
      },
    ]);

    expect(html).not.toContain("&#8226;");
    expect(html).toContain("Best bets");
    expect(html).toContain("margin-bottom:24px");
    expect(html).toContain("colspan=\"3\"");
    expect(html).toContain("https://images.example.com/scottie.jpg");
    expect(html).toContain("Scottie Scheffler");
    expect(html).toContain("United States");
    expect(html).toContain("+450");
    expect(html).not.toContain("(+450)");
    expect(html.indexOf("Scottie Scheffler")).toBeLessThan(
      html.indexOf("The clear favorite on a course that suits him."),
    );
  });

  it("leaves space above and below the rule between best-bet players", () => {
    const html = renderBodySummarySectionsHtml([
      {
        key: "Best Players and Odds",
        title: "Best Players and Odds",
        kind: "bullets",
        items: [
          { label: "Tom Kim (+1755):", body: "First Tour start since Asian Games gold." },
          { label: "Doug Ghim (+1878):", body: "Three top 20s in three fall starts." },
        ],
      },
    ]);

    expect(html).toContain("padding:8px 0 20px;");
    expect(html).toContain("padding:20px 12px 0 0;border-top:1px solid #e4e4e7;");
    expect(html).not.toMatch(/Doug Ghim[\s\S]*padding:8px 0 20px;/);
  });
});
