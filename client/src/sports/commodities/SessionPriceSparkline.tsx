import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buildAnchoredSparklinePoints,
  buildSessionSparklineChart,
  periodDividerXs,
  type SessionSparklineChart,
} from "./commoditySparkline";

type SessionPriceSparklineProps = {
  history: unknown;
  eventMetadata?: unknown;
  openPrice?: number | null;
  dayClosePrices?: Array<number | null>;
  currentPrice?: number | null;
  currentPeriod?: number | null;
  className?: string;
};

const HEIGHT = 72;
const PAD = 2;
const COLOR_ABOVE = "#16a34a";
const COLOR_BELOW = "#dc2626";
const ZERO_LINE_STROKE = "#cbd5e1";
const PERIOD_DIVIDER_STROKE = "#cbd5e1";
const GUIDE_LINE_DASH = "4 4";

type ChartPoint = { x: number; y: number; value: number };
type ColoredSegment = { points: string; color: string };

function colorForValue(value: number, openPrice: number): string {
  return value >= openPrice ? COLOR_ABOVE : COLOR_BELOW;
}

function valueToY(value: number, min: number, max: number): number {
  const range = max - min || 1;
  return PAD + (1 - (value - min) / range) * (HEIGHT - PAD * 2);
}

function appendSegment(
  segments: ColoredSegment[],
  color: string,
  x: number,
  y: number,
): void {
  const last = segments[segments.length - 1];
  const point = `${x},${y}`;
  if (last?.color === color) {
    last.points += ` ${point}`;
    return;
  }
  segments.push({ color, points: point });
}

export function buildOpenRelativeSegments(
  points: ChartPoint[],
  openPrice: number,
): ColoredSegment[] {
  if (points.length < 2) {
    return [];
  }

  const segments: ColoredSegment[] = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index]!;
    const end = points[index + 1]!;
    const startAbove = start.value >= openPrice;
    const endAbove = end.value >= openPrice;

    if (startAbove === endAbove) {
      appendSegment(segments, colorForValue(start.value, openPrice), start.x, start.y);
      appendSegment(segments, colorForValue(start.value, openPrice), end.x, end.y);
      continue;
    }

    const delta = end.value - start.value;
    const ratio = delta === 0 ? 0.5 : (openPrice - start.value) / delta;
    const crossX = start.x + ratio * (end.x - start.x);
    const crossY = start.y + ratio * (end.y - start.y);

    appendSegment(segments, colorForValue(start.value, openPrice), start.x, start.y);
    appendSegment(segments, colorForValue(start.value, openPrice), crossX, crossY);
    appendSegment(segments, colorForValue(end.value, openPrice), crossX, crossY);
    appendSegment(segments, colorForValue(end.value, openPrice), end.x, end.y);
  }

  return segments;
}

function buildSessionChartGeometry(
  chart: SessionSparklineChart,
  width: number,
): { segments: ColoredSegment[]; openLineY: number | null; periodLines: number[] } {
  const { openPrice, dayClosePrices, candles } = chart;
  const referenceOpen =
    openPrice != null && Number.isFinite(openPrice) ? openPrice : candles[0]!.c;
  const anchorValues = [
    referenceOpen,
    ...candles.map((candle) => candle.c),
    ...(dayClosePrices ?? []).filter((price): price is number => price != null && Number.isFinite(price)),
    ...(chart.currentPrice != null && Number.isFinite(chart.currentPrice) ? [chart.currentPrice] : []),
  ];
  const min = Math.min(...anchorValues);
  const max = Math.max(...anchorValues);
  const plotWidth = Math.max(width - PAD * 2, 1);

  const anchored = buildAnchoredSparklinePoints(chart, plotWidth, PAD);
  const points: ChartPoint[] = anchored.map((point) => ({
    x: point.x,
    y: valueToY(point.value, min, max),
    value: point.value,
  }));

  const periodLines = periodDividerXs(plotWidth, PAD);

  return {
    segments: buildOpenRelativeSegments(points, referenceOpen),
    openLineY: valueToY(referenceOpen, min, max),
    periodLines,
  };
}

export const SessionPriceSparkline: React.FC<SessionPriceSparklineProps> = ({
  history,
  eventMetadata,
  openPrice,
  dayClosePrices,
  currentPrice,
  currentPeriod,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateWidth = () => {
      setWidth(element.clientWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const chartModel = useMemo(
    () =>
      buildSessionSparklineChart(history, eventMetadata, {
        openPrice,
        dayClosePrices,
        currentPrice,
        currentPeriod,
      }),
    [history, eventMetadata, openPrice, dayClosePrices, currentPrice, currentPeriod],
  );

  const geometry = useMemo(() => {
    if (!chartModel || width < 2) {
      return null;
    }
    return buildSessionChartGeometry(chartModel, width);
  }, [chartModel, width]);

  if (!chartModel) {
    return (
      <div
        ref={containerRef}
        className={`h-[72px] w-full rounded-sm bg-slate-100 ${className}`}
        aria-hidden
      />
    );
  }

  return (
    <div ref={containerRef} className={`h-[72px] w-full ${className}`} aria-hidden>
      {geometry ? (
        <svg viewBox={`0 0 ${width} ${HEIGHT}`} className="block h-full w-full">
          {geometry.periodLines.map((x, index) => (
            <line
              key={`period-${index}`}
              x1={x}
              y1={PAD}
              x2={x}
              y2={HEIGHT - PAD}
              stroke={PERIOD_DIVIDER_STROKE}
              strokeWidth="1"
              strokeDasharray={GUIDE_LINE_DASH}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {geometry.openLineY != null ? (
            <line
              x1={PAD}
              y1={geometry.openLineY}
              x2={width - PAD}
              y2={geometry.openLineY}
              stroke={ZERO_LINE_STROKE}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {geometry.segments.map((segment, index) => (
            <polyline
              key={index}
              fill="none"
              stroke={segment.color}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={segment.points}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      ) : null}
    </div>
  );
};
