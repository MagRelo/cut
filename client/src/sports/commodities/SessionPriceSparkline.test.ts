import { describe, expect, it } from "vitest";
import { buildOpenRelativeSegments } from "./SessionPriceSparkline";

describe("buildOpenRelativeSegments", () => {
  it("colors each segment relative to open price", () => {
    const points = [
      { x: 0, y: 10, value: 98 },
      { x: 10, y: 8, value: 102 },
      { x: 20, y: 12, value: 97 },
    ];

    const segments = buildOpenRelativeSegments(points, 100);

    expect(segments).toHaveLength(3);
    expect(segments[0]?.color).toBe("#dc2626");
    expect(segments[1]?.color).toBe("#16a34a");
    expect(segments[2]?.color).toBe("#dc2626");
  });

  it("splits at the open-price crossing", () => {
    const points = [
      { x: 0, y: 10, value: 99 },
      { x: 10, y: 8, value: 101 },
    ];

    const segments = buildOpenRelativeSegments(points, 100);

    expect(segments).toHaveLength(2);
    expect(segments[0]?.color).toBe("#dc2626");
    expect(segments[1]?.color).toBe("#16a34a");
    expect(segments[0]?.points).toContain(",");
    expect(segments[1]?.points).toContain(",");
  });
});
