import React, { useMemo } from "react";

type PriceSparklineProps = {
  values: number[];
  className?: string;
};

const WIDTH = 88;
const HEIGHT = 36;
const PAD = 2;

export const PriceSparkline: React.FC<PriceSparklineProps> = ({ values, className = "" }) => {
  const { points, color } = useMemo(() => {
    if (values.length < 2) {
      return { points: "", color: "#94a3b8" };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const trend = values[values.length - 1] - values[0];

    const path = values
      .map((value, index) => {
        const x = PAD + (index / (values.length - 1)) * (WIDTH - PAD * 2);
        const y = PAD + (1 - (value - min) / range) * (HEIGHT - PAD * 2);
        return `${x},${y}`;
      })
      .join(" ");

    return {
      points: path,
      color: trend >= 0 ? "#16a34a" : "#dc2626",
    };
  }, [values]);

  if (values.length < 2) {
    return (
      <div
        className={`h-9 w-full rounded-sm bg-slate-100 ${className}`}
        aria-hidden
      />
    );
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={`h-9 w-full ${className}`}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};
