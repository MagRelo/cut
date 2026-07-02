import { describe, expect, it } from "vitest";
import {
  buildSessionSparklineChart,
  buildSparklinePoints,
  columnDividerX,
  columnPlotWindow,
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

const WED_START_METADATA = {
  commodities: {
    sessionDate: "2026-06-29",
    sessionOpen: "2026-07-01T18:00:00.000Z",
    sessionClose: "2026-07-03T20:30:00.000Z",
  },
};

const SESSION_OPEN_MS = new Date("2026-06-29T13:30:00.000Z").getTime();
const MON_CLOSE_MS = new Date("2026-06-29T20:30:00.000Z").getTime();
const TUE_CLOSE_MS = new Date("2026-06-30T20:30:00.000Z").getTime();
const PLOT_WIDTH = 100;
const PAD = 2;
const COLUMN_WIDTH = PLOT_WIDTH / 5;

function candleHistory(points: Array<{ t: number; c: number }>) {
  return points;
}

function columnStartX(dayIndex: number): number {
  return PAD + dayIndex * COLUMN_WIDTH;
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
    const { plotStartMs, plotEndMs } = columnPlotWindow(0, chart)!;
    expect(plotEndMs - plotStartMs).toBe(SPARKLINE_COLUMN_MS);

    const openX = timestampToX(SESSION_OPEN_MS, chart, PLOT_WIDTH, PAD)!;
    const openFraction = (openX - columnStartX(0)) / COLUMN_WIDTH;
    expect(openFraction).toBeGreaterThan(0.65);
  });

  it("places session close timestamps on grid dividers", () => {
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

describe("buildSparklinePoints", () => {
  it("plots every candle through the session end", () => {
    const candles = Array.from({ length: 120 }, (_, index) => ({
      t: SESSION_OPEN_MS + index * 5 * 60_000,
      c: 6.17 + index * 0.0002,
    }));
    const chart = buildSessionSparklineChart(candles, EVENT_METADATA, {
      openPrice: 6.1715,
      currentPrice: 6.1524,
    })!;
    const overnight = new Date("2026-07-01T02:00:00.000Z").getTime();
    const points = buildSparklinePoints(chart, PLOT_WIDTH, PAD, overnight);
    const wedColumnStart = columnStartX(2);
    const lastPoint = points[points.length - 1];

    expect(points.length).toBeGreaterThan(2);
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
      { openPrice: 6.17 },
    )!;
    const overnight = new Date("2026-06-30T15:00:00.000Z").getTime();
    const points = buildSparklinePoints(chart, PLOT_WIDTH, PAD, overnight);
    const tueColumnStart = columnStartX(1);
    const tueColumnEnd = columnDividerX(1, PLOT_WIDTH, PAD);
    const overnightPoint = points.find((point) => point.value === 6.2);

    expect(overnightPoint?.x).toBeGreaterThan(tueColumnStart);
    expect(overnightPoint?.x).toBeLessThan(tueColumnEnd);
  });

  it("keeps points in ascending x order", () => {
    const chart = buildSessionSparklineChart(
      candleHistory([
        { t: SESSION_OPEN_MS, c: 100 },
        { t: MON_CLOSE_MS, c: 101 },
        { t: MON_CLOSE_MS + 2 * 60 * 60_000, c: 102 },
        { t: TUE_CLOSE_MS, c: 103 },
      ]),
      EVENT_METADATA,
      { openPrice: 100 },
    )!;
    const points = buildSparklinePoints(
      chart,
      PLOT_WIDTH,
      PAD,
      new Date("2026-06-30T15:00:00.000Z").getTime(),
    );

    for (let index = 1; index < points.length; index += 1) {
      expect(points[index]!.x).toBeGreaterThanOrEqual(points[index - 1]!.x);
    }
  });

  it("plots all candles without downsampling", () => {
    const thuOpenMs = new Date("2026-07-02T13:30:00.000Z").getTime();
    const candles = Array.from({ length: 50 }, (_, index) => ({
      t: thuOpenMs + index * 5 * 60_000,
      c: 1218 + Math.sin(index / 8) * 2,
    }));
    const chart = buildSessionSparklineChart(candles, EVENT_METADATA, {
      openPrice: 1218.3,
      currentPrice: candles[candles.length - 1]!.c,
    })!;
    const points = buildSparklinePoints(
      chart,
      PLOT_WIDTH,
      PAD,
      candles[candles.length - 1]!.t,
    );

    expect(points.length).toBe(candles.length);
    expect(points[0]?.value).toBe(candles[0]!.c);
    expect(points[points.length - 1]?.value).toBe(candles[candles.length - 1]!.c);
  });

  it("maps a full session of candles without blocking the UI thread", () => {
    const sessionOpenMs = new Date("2026-06-29T13:30:00.000Z").getTime();
    const sessionCloseMs = new Date("2026-07-03T20:30:00.000Z").getTime();
    const stepMs = 5 * 60_000;
    const candles = Array.from(
      { length: Math.floor((sessionCloseMs - sessionOpenMs) / stepMs) },
      (_, index) => ({
        t: sessionOpenMs + index * stepMs,
        c: 100 + Math.sin(index / 20) * 5,
      }),
    );

    const started = performance.now();
    const chart = buildSessionSparklineChart(candles, EVENT_METADATA, {
      openPrice: 100,
      currentPrice: candles.at(-1)!.c,
    })!;
    const points = buildSparklinePoints(chart, 350, PAD, sessionCloseMs);
    const elapsedMs = performance.now() - started;

    expect(points.length).toBeGreaterThan(100);
    expect(elapsedMs).toBeLessThan(100);
  });
});

describe("periodDividerXs", () => {
  it("aligns Mon–Thu scoring closes; Fri close is the chart edge", () => {
    const dividers = periodDividerXs(PLOT_WIDTH, PAD);
    expect(dividers).toHaveLength(4);
    expect(dividers[0]).toBeCloseTo(columnDividerX(0, PLOT_WIDTH, PAD), 5);
    expect(dividers[3]).toBeCloseTo(columnDividerX(3, PLOT_WIDTH, PAD), 5);
  });
});

describe("Wed-afternoon session start", () => {
  const WED_OPEN_MS = new Date("2026-07-01T18:00:00.000Z").getTime();
  const WED_MID_MS = new Date("2026-07-01T19:30:00.000Z").getTime();
  const WED_CLOSE_MS = new Date("2026-07-01T20:30:00.000Z").getTime();
  const THU_AFTER_CLOSE_MS = WED_CLOSE_MS + 60 * 60 * 1000;

  it("places Wed session open proportionally in the Wed column, not at the grid edge", () => {
    const chart = buildSessionSparklineChart(
      candleHistory([
        { t: WED_OPEN_MS, c: 100 },
        { t: WED_MID_MS, c: 101 },
      ]),
      WED_START_METADATA,
      { openPrice: 100 },
    )!;

    const { plotStartMs, plotEndMs } = columnPlotWindow(2, chart)!;
    const wedColumnStart = columnStartX(2);
    const openX = timestampToX(WED_OPEN_MS, chart, PLOT_WIDTH, PAD)!;
    const midX = timestampToX(WED_MID_MS, chart, PLOT_WIDTH, PAD)!;
    const openFraction = (WED_OPEN_MS - plotStartMs) / (plotEndMs - plotStartMs);
    const expectedOpenX = wedColumnStart + openFraction * COLUMN_WIDTH;

    expect(openFraction).toBeGreaterThan(0.5);
    expect(openX).toBeCloseTo(expectedOpenX, 0);
    expect(midX).toBeGreaterThan(openX);
  });

  it("maps post-Wed-close candles into the Thursday column", () => {
    const chart = buildSessionSparklineChart(
      candleHistory([
        { t: WED_OPEN_MS, c: 100 },
        { t: WED_CLOSE_MS, c: 101 },
        { t: THU_AFTER_CLOSE_MS, c: 101.5 },
      ]),
      WED_START_METADATA,
      { openPrice: 100 },
    )!;

    const thuColumnStart = columnDividerX(2, PLOT_WIDTH, PAD);
    const thuColumnEnd = columnDividerX(3, PLOT_WIDTH, PAD);
    const afterCloseX = timestampToX(THU_AFTER_CLOSE_MS, chart, PLOT_WIDTH, PAD)!;

    expect(afterCloseX).toBeGreaterThan(thuColumnStart);
    expect(afterCloseX).toBeLessThan(thuColumnEnd);
  });

  it("does not map pre-session timestamps to Mon/Tue columns", () => {
    const chart = buildSessionSparklineChart(
      candleHistory([
        { t: WED_OPEN_MS, c: 100 },
        { t: WED_MID_MS, c: 101 },
      ]),
      WED_START_METADATA,
      { openPrice: 100 },
    )!;

    expect(timestampToX(SESSION_OPEN_MS, chart, PLOT_WIDTH, PAD)).toBeNull();
  });
});
