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
  /** Precomputed — `isCommoditiesPeriodScorable` rebuilds timezone timestamps each call. */
  periodScorable: boolean[];
  firstScorable: number | null;
  openPrice?: number | null;
  currentPrice?: number | null;
};

type SparklineChartTiming = Pick<
  SessionSparklineChart,
  | "sessionBounds"
  | "sessionOpenMs"
  | "sessionCloseMs"
  | "periodCloseMs"
  | "periodScorable"
  | "firstScorable"
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
  if (!chart.periodScorable[dayIndex]) {
    return null;
  }

  const plotEndMs = chart.periodCloseMs[dayIndex]!;

  if (dayIndex === 0 && chart.firstScorable === 1) {
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
    currentPrice?: number | null;
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

  const periodScorable = Array.from({ length: COMMODITIES_ROUND_COUNT }, (_, index) =>
    isCommoditiesPeriodScorable(index + 1, bounds),
  );

  return {
    candles,
    sessionBounds: bounds,
    sessionOpenMs,
    sessionCloseMs,
    periodCloseMs: buildSessionDayCloseTimestamps(bounds),
    periodScorable,
    firstScorable: firstScorablePeriod(bounds),
    openPrice: options?.openPrice,
    currentPrice: options?.currentPrice,
  };
}

/** Mon–Thu scoring-day close dividers; Fri close is the chart edge. */
export function periodDividerXs(plotWidth: number, pad: number): number[] {
  return Array.from({ length: COMMODITIES_ROUND_COUNT - 1 }, (_, index) =>
    columnDividerX(index, plotWidth, pad),
  );
}

export type SparklinePlotPoint = { x: number; value: number };

function mergePlotPointsByX(points: SparklinePlotPoint[]): SparklinePlotPoint[] {
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

/** Plot session candles mapped onto the Mon–Fri grid; optional live price at `nowMs`. */
export function buildSparklinePoints(
  chart: SessionSparklineChart,
  plotWidth: number,
  pad: number,
  nowMs: number = Date.now(),
): SparklinePlotPoint[] {
  const { candles, currentPrice } = chart;
  if (candles.length < 2) {
    return [];
  }

  const endMs = resolveSparklineEndMs(chart, nowMs);
  const points: SparklinePlotPoint[] = [];

  for (const candle of candles) {
    if (candle.t > endMs) {
      continue;
    }
    const x = timestampToX(candle.t, chart, plotWidth, pad);
    if (x == null) {
      continue;
    }
    points.push({ x, value: candle.c });
  }

  const lastX = timestampToX(endMs, chart, plotWidth, pad);
  if (
    lastX != null &&
    currentPrice != null &&
    Number.isFinite(currentPrice)
  ) {
    points.push({ x: lastX, value: currentPrice });
  }

  return mergePlotPointsByX(points);
}
