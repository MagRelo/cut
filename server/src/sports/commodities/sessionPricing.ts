export type CandleInterval = "1m" | "5m" | "15m" | "1h" | "4h";

const INTERVAL_MS: Record<CandleInterval, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
};

export const INTERVAL_MS_FOR_FIXTURE = INTERVAL_MS;

const MAX_CANDLES = 5000;

const ALL_CANDLE_INTERVALS: CandleInterval[] = ["1m", "5m", "15m", "1h", "4h"];

/** Pick finest interval that fits the session window within HL's 5000-candle cap. */
export function selectCandleInterval(sessionOpenMs: number, sessionCloseMs: number): CandleInterval {
  const durationMs = Math.max(sessionCloseMs - sessionOpenMs, INTERVAL_MS["1m"]);
  const intervals: CandleInterval[] = ["1m", "5m", "15m", "1h", "4h"];

  for (const interval of intervals) {
    const candleMs = INTERVAL_MS[interval];
    const count = Math.ceil(durationMs / candleMs) + 2;
    if (count <= MAX_CANDLES) {
      return interval;
    }
  }

  return "4h";
}

/** Intervals to try for session boundaries: preferred first, then coarser fallbacks. */
export function sessionCandleIntervals(
  sessionOpenMs: number,
  sessionCloseMs: number,
): CandleInterval[] {
  const preferred = selectCandleInterval(sessionOpenMs, sessionCloseMs);
  const startIdx = ALL_CANDLE_INTERVALS.indexOf(preferred);
  return ALL_CANDLE_INTERVALS.slice(startIdx >= 0 ? startIdx : 0);
}

export function parseCandleClose(candle: { c: string }): number | null {
  const parsed = Number.parseFloat(candle.c);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Price at target: close of last candle with open time <= targetMs. */
export function resolvePriceAtTimestamp(
  candles: Array<{ t: number; c: string }>,
  targetMs: number,
): number | null {
  if (candles.length === 0) {
    return null;
  }

  const sorted = [...candles].sort((a, b) => a.t - b.t);
  let best: { t: number; c: string } | null = null;

  for (const candle of sorted) {
    if (candle.t <= targetMs) {
      best = candle;
    } else {
      break;
    }
  }

  if (best) {
    return parseCandleClose(best);
  }

  const nearest = sorted.reduce((prev, curr) => {
    const prevDelta = Math.abs(prev.t - targetMs);
    const currDelta = Math.abs(curr.t - targetMs);
    return currDelta < prevDelta ? curr : prev;
  });

  return parseCandleClose(nearest);
}

export function candleFetchWindow(
  sessionOpenMs: number,
  sessionCloseMs: number,
  interval: CandleInterval,
): { startMs: number; endMs: number } {
  const padding = INTERVAL_MS[interval] * 3;
  return {
    startMs: sessionOpenMs - padding,
    endMs: sessionCloseMs + padding,
  };
}
