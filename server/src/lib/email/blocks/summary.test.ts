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
});
