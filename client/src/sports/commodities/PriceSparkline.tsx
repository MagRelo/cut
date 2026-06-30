import React, { useEffect, useMemo, useRef, useState } from "react";

type PriceSparklineProps = {
  values: number[];
  /** When set, line color follows this (e.g. HL 24h %) instead of sparkline endpoints. */
  changePercent?: number | null;
  className?: string;
};

const HEIGHT = 36;
const PAD = 2;

function buildSparklinePoints(
  values: number[],
  width: number,
  changePercent?: number | null,
): { points: string; color: string } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const sparklineTrend = values[values.length - 1] - values[0];
  const positive =
    changePercent != null && Number.isFinite(changePercent)
      ? changePercent >= 0
      : sparklineTrend >= 0;
  const plotWidth = Math.max(width - PAD * 2, 1);

  const points = values
    .map((value, index) => {
      const x = PAD + (index / (values.length - 1)) * plotWidth;
      const y = PAD + (1 - (value - min) / range) * (HEIGHT - PAD * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return {
    points,
    color: positive ? "#16a34a" : "#dc2626",
  };
}

export const PriceSparkline: React.FC<PriceSparklineProps> = ({
  values,
  changePercent,
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

  const chart = useMemo(() => {
    if (values.length < 2 || width < 2) {
      return null;
    }
    return buildSparklinePoints(values, width, changePercent);
  }, [values, width, changePercent]);

  if (values.length < 2) {
    return (
      <div
        ref={containerRef}
        className={`h-9 w-full rounded-sm bg-slate-100 ${className}`}
        aria-hidden
      />
    );
  }

  return (
    <div ref={containerRef} className={`h-9 w-full ${className}`} aria-hidden>
      {chart ? (
        <svg
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className="block h-full w-full"
        >
          <polyline
            fill="none"
            stroke={chart.color}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={chart.points}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : null}
    </div>
  );
};
