import { describe, expect, it } from "vitest";
import {
  buildAnchoredSparklinePoints,
  buildSessionSparklineChart,
  columnDividerX,
  columnTimeWindow,
  periodDividerXs,
  SPARKLINE_COLUMN_MS,
  timestampToX,
} from "./commoditySparkline";

const EVENT_METADATA = {
  commodities: {
    sessionDate: "2026-06-29",
    sessionOpen: "2026-06-29T13:30:00.000Z",
    sessionClose: "2026-07-03T20:30:00.000Z",
  },
};

const SESSION_OPEN_MS = new Date("2026-06-29T13:30:00.000Z").getTime();
const MON_CLOSE_MS = new Date("2026-06-29T20:30:00.000Z").getTime();
const TUE_CLOSE_MS = new Date("2026-06-30T20:30:00.000Z").getTime();
const PLOT_WIDTH = 100;
const PAD = 2;

function candleHistory(points: Array<{ t: number; c: number }>) {
  return points;
}

describe("buildSessionSparklineChart", () => {
  it("builds day close timestamps", () => {
    const chart = buildSessionSparklineChart(
      candleHistory([
        { t: SESSION_OPEN_MS, c: 100 },
        { t: SESSION_OPEN_MS + 300_000, c: 101 },
      ]),
      EVENT_METADATA,
      { openPrice: 100 },
    );

    expect(chart).not.toBeNull();
    expect(chart?.periodCloseMs).toHaveLength(5);
  });

  it("returns null without session metadata", () => {
    expect(buildSessionSparklineChart([1, 2, 3], {})).toBeNull();
  });
});

describe("timestampToX", () => {
  it("leaves the first ~70% of Monday empty before 9:30 open", () => {
    const chart = buildSessionSparklineChart(
      candleHistory([
        { t: SESSION_OPEN_MS, c: 100 },
        { t: MON_CLOSE_MS, c: 101 },
      ]),
      EVENT_METADATA,
      { openPrice: 100 },
    )!;
    const { startMs, endMs } = columnTimeWindow(0, chart);
    expect(endMs - startMs).toBe(SPARKLINE_COLUMN_MS);

    const openX = timestampToX(SESSION_OPEN_MS, chart, PLOT_WIDTH, PAD)!;
    const columnStartX = PAD;
    const openFraction = (openX - columnStartX) / (PLOT_WIDTH / 5);
    expect(openFraction).toBeGreaterThan(0.65);
  });

  it("places each imposed close on its divider", () => {
    const chart = buildSessionSparklineChart(
      candleHistory([
        { t: SESSION_OPEN_MS, c: 100 },
        { t: MON_CLOSE_MS, c: 101 },
      ]),
      EVENT_METADATA,
      { openPrice: 100 },
    )!;
    const monCloseX = timestampToX(MON_CLOSE_MS, chart, PLOT_WIDTH, PAD)!;
    expect(monCloseX).toBeCloseTo(columnDividerX(0, PLOT_WIDTH, PAD), 5);
  });
});

describe("buildAnchoredSparklinePoints", () => {
  it("keeps tuesday close on the divider but extends into wednesday overnight", () => {
    const candles = Array.from({ length: 120 }, (_, index) => ({
      t: SESSION_OPEN_MS + index * 5 * 60_000,
      c: 6.17 + index * 0.0002,
    }));
    const chart = buildSessionSparklineChart(candles, EVENT_METADATA, {
      openPrice: 6.1715,
      dayClosePrices: [6.1765, 6.2525, null, null, null],
      currentPrice: 6.1524,
    })!;
    const overnight = new Date("2026-07-01T02:00:00.000Z").getTime();
    const points = buildAnchoredSparklinePoints(chart, PLOT_WIDTH, PAD, overnight);
    const tueDivider = columnDividerX(1, PLOT_WIDTH, PAD);
    const wedColumnStart = PAD + PLOT_WIDTH * 0.4;
    const dividerPoint = points.find((point) => Math.abs(point.x - tueDivider) < 0.01);
    const lastPoint = points[points.length - 1];

    expect(dividerPoint?.value).toBe(6.2525);
    expect(lastPoint?.x).toBeGreaterThan(wedColumnStart);
    expect(lastPoint?.value).toBe(6.1524);
  });

  it("plots Tue overnight candles inside the Tuesday column", () => {
    const chart = buildSessionSparklineChart(
      candleHistory([
        { t: SESSION_OPEN_MS, c: 6.17 },
        { t: MON_CLOSE_MS, c: 6.18 },
        { t: MON_CLOSE_MS + 2 * 60 * 60_000, c: 6.2 },
        { t: TUE_CLOSE_MS, c: 6.25 },
      ]),
      EVENT_METADATA,
      {
        openPrice: 6.17,
        dayClosePrices: [6.18, 6.25, null, null, null],
      },
    )!;
    const overnight = new Date("2026-06-30T15:00:00.000Z").getTime();
    const points = buildAnchoredSparklinePoints(chart, PLOT_WIDTH, PAD, overnight);
    const tueColumnStart = PAD + PLOT_WIDTH * 0.2;
    const tueColumnEnd = columnDividerX(1, PLOT_WIDTH, PAD);
    const overnightPoint = points.find((point) => point.value === 6.2);

    expect(overnightPoint?.x).toBeGreaterThan(tueColumnStart);
    expect(overnightPoint?.x).toBeLessThan(tueColumnEnd);
  });

  it("keeps points in ascending x order after divider anchors", () => {
    const chart = buildSessionSparklineChart(
      candleHistory([
        { t: SESSION_OPEN_MS, c: 100 },
        { t: MON_CLOSE_MS, c: 101 },
        { t: MON_CLOSE_MS + 2 * 60 * 60_000, c: 102 },
        { t: TUE_CLOSE_MS, c: 103 },
      ]),
      EVENT_METADATA,
      {
        openPrice: 100,
        dayClosePrices: [101, 103, null, null, null],
      },
    )!;
    const points = buildAnchoredSparklinePoints(
      chart,
      PLOT_WIDTH,
      PAD,
      new Date("2026-06-30T15:00:00.000Z").getTime(),
    );

    for (let index = 1; index < points.length; index += 1) {
      expect(points[index]!.x).toBeGreaterThanOrEqual(points[index - 1]!.x);
    }
  });
});

describe("periodDividerXs", () => {
  it("aligns Mon–Thu dividers; Fri close is the chart edge", () => {
    const dividers = periodDividerXs(PLOT_WIDTH, PAD);
    expect(dividers).toHaveLength(4);
    expect(dividers[0]).toBeCloseTo(columnDividerX(0, PLOT_WIDTH, PAD), 5);
    expect(dividers[3]).toBeCloseTo(columnDividerX(3, PLOT_WIDTH, PAD), 5);
  });
});
