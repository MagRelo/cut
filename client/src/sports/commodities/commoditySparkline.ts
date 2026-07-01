import type { CommodityPriceHistoryPoint } from "@cut/sport-commodities";
import {
  buildSessionDayCloseTimestamps,
  COMMODITIES_ROUND_COUNT,
  firstScorablePeriod,
  isCommoditiesPeriodScorable,
  parseCommoditiesEventMetadata,
  resolveCommoditiesSessionBounds,
  type CommoditiesSessionBounds,
} from "@cut/sport-commodities";

/** Default Mon column window when the session starts Monday 9:30. */
export const SPARKLINE_COLUMN_MS = 24 * 60 * 60 * 1000;

export type SessionSparklineChart = {
  candles: CommodityPriceHistoryPoint[];
  sessionBounds: CommoditiesSessionBounds;
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
  "sessionBounds" | "sessionOpenMs" | "sessionCloseMs" | "periodCloseMs"
>;

/** Right edge of scoring-day column `dayIndex`; each day's 4:30 PM close sits here. */
export function columnDividerX(dayIndex: number, plotWidth: number, pad: number): number {
  const columnWidth = plotWidth / COMMODITIES_ROUND_COUNT;
  return pad + (dayIndex + 1) * columnWidth;
}

/** Time span mapped across each Mon–Fri scoring column (prior close → this close). */
export function columnPlotWindow(
  dayIndex: number,
  chart: SparklineChartTiming,
): { plotStartMs: number; plotEndMs: number } | null {
  const periodNumber = dayIndex + 1;
  if (!isCommoditiesPeriodScorable(periodNumber, chart.sessionBounds)) {
    return null;
  }

  const plotEndMs = chart.periodCloseMs[dayIndex]!;
  const firstScorable = firstScorablePeriod(chart.sessionBounds);

  if (dayIndex === 0 && firstScorable === 1) {
    return { plotStartMs: plotEndMs - SPARKLINE_COLUMN_MS, plotEndMs };
  }

  return { plotStartMs: chart.periodCloseMs[dayIndex - 1]!, plotEndMs };
}

/**
 * Map timestamp → x within scoring-day columns.
 * Each column spans prior close → this close; the close lands on the calendar grid divider.
 */
export function timestampToX(
  timestampMs: number,
  chart: SparklineChartTiming,
  plotWidth: number,
  pad: number,
): number | null {
  if (timestampMs < chart.sessionOpenMs || timestampMs > chart.sessionCloseMs) {
    return null;
  }

  const columnWidth = plotWidth / COMMODITIES_ROUND_COUNT;

  for (let dayIndex = 0; dayIndex < COMMODITIES_ROUND_COUNT; dayIndex += 1) {
    const window = columnPlotWindow(dayIndex, chart);
    if (!window) {
      continue;
    }

    const { plotStartMs, plotEndMs } = window;
    if (timestampMs > plotEndMs) {
      continue;
    }

    const visibleStartMs = Math.max(plotStartMs, chart.sessionOpenMs);
    if (timestampMs < visibleStartMs) {
      continue;
    }

    const span = plotEndMs - plotStartMs || 1;
    const fraction = (timestampMs - plotStartMs) / span;
    return pad + dayIndex * columnWidth + fraction * columnWidth;
  }

  return null;
}

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

  const bounds = resolveCommoditiesSessionBounds({
    sessionDate: commodities.sessionDate,
    sessionOpen: commodities.sessionOpen,
    sessionClose: commodities.sessionClose,
  });

  const sessionOpenMs = new Date(commodities.sessionOpen).getTime();
  const sessionCloseMs = new Date(commodities.sessionClose).getTime();
  if (Number.isNaN(sessionOpenMs) || Number.isNaN(sessionCloseMs) || sessionCloseMs <= sessionOpenMs) {
    return null;
  }

  const candles = normalizePriceHistory(history, sessionOpenMs).filter(
    (candle) => candle.t >= sessionOpenMs,
  );
  if (candles.length < 2) {
    return null;
  }

  return {
    candles,
    sessionBounds: bounds,
    sessionOpenMs,
    sessionCloseMs,
    periodCloseMs: buildSessionDayCloseTimestamps(bounds),
    openPrice: options?.openPrice,
    dayClosePrices: options?.dayClosePrices,
    currentPrice: options?.currentPrice,
    currentPeriod: options?.currentPeriod,
  };
}

/** Mon–Thu scoring-day close dividers; Fri close is the chart edge. */
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

/** Plot candles close-to-close; imposed daily closes anchor on the calendar grid dividers. */
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
    const periodNumber = dayIndex + 1;
    if (!isCommoditiesPeriodScorable(periodNumber, chart.sessionBounds)) {
      continue;
    }

    const closeMs = chart.periodCloseMs[dayIndex]!;
    if (closeMs > endMs) {
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
