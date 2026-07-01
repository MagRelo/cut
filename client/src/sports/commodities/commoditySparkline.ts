import type { CommodityPriceHistoryPoint } from "@cut/sport-commodities";
import {
  buildSessionDayCloseTimestamps,
  COMMODITIES_ROUND_COUNT,
  parseCommoditiesEventMetadata,
} from "@cut/sport-commodities";

/** Each Mon–Fri column spans a 24h window ending at that day's 4:30 PM ET close. */
export const SPARKLINE_COLUMN_MS = 24 * 60 * 60 * 1000;

export type SessionSparklineChart = {
  candles: CommodityPriceHistoryPoint[];
  sessionOpenMs: number;
  sessionCloseMs: number;
  periodCloseMs: number[];
  openPrice?: number | null;
  dayClosePrices?: Array<number | null>;
  currentPrice?: number | null;
  currentPeriod?: number | null;
};

type SparklineChartTiming = Pick<
  SessionSparklineChart,
  "sessionOpenMs" | "sessionCloseMs" | "periodCloseMs"
>;

export function normalizePriceHistory(
  history: unknown,
  sessionOpenMs: number,
  intervalMs = 5 * 60 * 1000,
): CommodityPriceHistoryPoint[] {
  if (!Array.isArray(history) || history.length < 2) {
    return [];
  }

  const first = history[0];
  if (first && typeof first === "object" && "t" in first && "c" in first) {
    return (history as CommodityPriceHistoryPoint[])
      .filter(
        (point) =>
          typeof point.t === "number" &&
          Number.isFinite(point.t) &&
          typeof point.c === "number" &&
          Number.isFinite(point.c),
      )
      .sort((a, b) => a.t - b.t);
  }

  return (history as number[])
    .filter((value) => typeof value === "number" && Number.isFinite(value))
    .map((c, index) => ({ t: sessionOpenMs + index * intervalMs, c }));
}

/** 24h window ending at the day's imposed close (divider at column right edge). */
export function columnTimeWindow(
  dayIndex: number,
  chart: SparklineChartTiming,
): { startMs: number; endMs: number } {
  const endMs = chart.periodCloseMs[dayIndex]!;
  if (dayIndex === 0) {
    return { startMs: endMs - SPARKLINE_COLUMN_MS, endMs };
  }
  return { startMs: chart.periodCloseMs[dayIndex - 1]!, endMs };
}

export function columnDividerX(dayIndex: number, plotWidth: number, pad: number): number {
  const columnWidth = plotWidth / COMMODITIES_ROUND_COUNT;
  return pad + (dayIndex + 1) * columnWidth;
}

export function timestampToX(
  timestampMs: number,
  chart: SparklineChartTiming,
  plotWidth: number,
  pad: number,
): number | null {
  const columnWidth = plotWidth / COMMODITIES_ROUND_COUNT;

  for (let dayIndex = 0; dayIndex < COMMODITIES_ROUND_COUNT; dayIndex += 1) {
    const { startMs, endMs } = columnTimeWindow(dayIndex, chart);
    const visibleStartMs = dayIndex === 0 ? Math.max(startMs, chart.sessionOpenMs) : startMs;
    if (timestampMs < visibleStartMs || timestampMs > endMs) {
      continue;
    }

    const fraction = (timestampMs - startMs) / (endMs - startMs);
    return pad + dayIndex * columnWidth + fraction * columnWidth;
  }

  return null;
}

export function buildSessionSparklineChart(
  history: unknown,
  eventMetadata: unknown,
  options?: {
    openPrice?: number | null;
    dayClosePrices?: Array<number | null>;
    currentPrice?: number | null;
    currentPeriod?: number | null;
  },
): SessionSparklineChart | null {
  const commodities = parseCommoditiesEventMetadata(eventMetadata);
  if (!commodities?.sessionOpen || !commodities?.sessionClose) {
    return null;
  }

  const sessionOpenMs = new Date(commodities.sessionOpen).getTime();
  const sessionCloseMs = new Date(commodities.sessionClose).getTime();
  if (Number.isNaN(sessionOpenMs) || Number.isNaN(sessionCloseMs) || sessionCloseMs <= sessionOpenMs) {
    return null;
  }

  const candles = normalizePriceHistory(history, sessionOpenMs);
  if (candles.length < 2) {
    return null;
  }

  return {
    candles,
    sessionOpenMs,
    sessionCloseMs,
    periodCloseMs: buildSessionDayCloseTimestamps(commodities.sessionOpen, commodities.sessionClose),
    openPrice: options?.openPrice,
    dayClosePrices: options?.dayClosePrices,
    currentPrice: options?.currentPrice,
    currentPeriod: options?.currentPeriod,
  };
}

/** Mon–Thu close dividers; Fri end is the chart edge. */
export function periodDividerXs(plotWidth: number, pad: number): number[] {
  return Array.from({ length: COMMODITIES_ROUND_COUNT - 1 }, (_, index) =>
    columnDividerX(index, plotWidth, pad),
  );
}

export type SparklinePlotPoint = { x: number; value: number };

function setAnchorPoint(points: SparklinePlotPoint[], x: number, value: number): void {
  const last = points[points.length - 1];
  if (last && Math.abs(last.x - x) < 0.01) {
    last.value = value;
    return;
  }
  points.push({ x, value });
}

function sortPlotPointsByX(points: SparklinePlotPoint[]): SparklinePlotPoint[] {
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const merged: SparklinePlotPoint[] = [];

  for (const point of sorted) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(last.x - point.x) < 0.01) {
      last.value = point.value;
      continue;
    }
    merged.push({ ...point });
  }

  return merged;
}

function resolveSparklineEndMs(chart: SessionSparklineChart, nowMs: number): number {
  return Math.min(nowMs, chart.sessionCloseMs);
}

/**
 * Plot every HL candle on a close-to-close timeline:
 * - Mon column: 24h slot ending Mon 4:30; line only from Mon 9:30 (~70% empty on the left)
 * - Tue–Fri columns: full 24h from prior close → this close (includes overnight)
 * Dividers mark imposed daily scoring closes. The live tail always follows now (HL keeps trading overnight).
 */
export function buildAnchoredSparklinePoints(
  chart: SessionSparklineChart,
  plotWidth: number,
  pad: number,
  nowMs: number = Date.now(),
): SparklinePlotPoint[] {
  const { candles, openPrice, dayClosePrices, currentPrice } = chart;
  if (candles.length < 2) {
    return [];
  }

  const referenceOpen =
    openPrice != null && Number.isFinite(openPrice) ? openPrice : candles[0]!.c;
  const endMs = resolveSparklineEndMs(chart, nowMs);
  const points: SparklinePlotPoint[] = [];

  const openX = timestampToX(chart.sessionOpenMs, chart, plotWidth, pad);
  if (openX != null) {
    setAnchorPoint(points, openX, referenceOpen);
  }

  for (const candle of candles) {
    if (candle.t > endMs) {
      continue;
    }
    const x = timestampToX(candle.t, chart, plotWidth, pad);
    if (x == null) {
      continue;
    }
    setAnchorPoint(points, x, candle.c);
  }

  for (let dayIndex = 0; dayIndex < COMMODITIES_ROUND_COUNT; dayIndex += 1) {
    const dividerMs = chart.periodCloseMs[dayIndex]!;
    if (dividerMs > endMs) {
      break;
    }
    const closePrice = dayClosePrices?.[dayIndex];
    if (closePrice == null || !Number.isFinite(closePrice)) {
      continue;
    }
    setAnchorPoint(points, columnDividerX(dayIndex, plotWidth, pad), closePrice);
  }

  const lastX = timestampToX(endMs, chart, plotWidth, pad);
  if (lastX == null) {
    return sortPlotPointsByX(points);
  }

  const lastValue =
    currentPrice != null && Number.isFinite(currentPrice)
      ? currentPrice
      : candles[candles.length - 1]!.c;
  setAnchorPoint(points, lastX, lastValue);

  return sortPlotPointsByX(points);
}
