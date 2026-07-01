import {
  buildSessionDayCloseTimestamps,
  commoditiesScoringPeriod,
  firstScorablePeriod,
  isCommoditiesPeriodScorable,
  resolveCommoditiesSessionBounds,
  type CommoditiesSessionBounds,
  type CommoditiesSessionCalendar,
} from "./session-timing.js";

export const COMMODITIES_ROUND_COUNT = 5;
export const COMMODITIES_LOSS_RATIO = 0.4;

export type CommodityRoundScore = {
  total: number;
  pctReturn?: number | null;
  provisional?: boolean;
};

export interface CommodityDailyScoreInput {
  openPrice: number | null | undefined;
  /** Mon–Fri session close prices, length 5. */
  dayClosePrices: Array<number | null | undefined>;
  currentPrice: number | null | undefined;
  closePrice?: number | null;
  isComplete: boolean;
  /** Required when sessionOpen/sessionClose are omitted. */
  currentPeriod?: number;
  /** Monday anchor YYYY-MM-DD for the ISO week. */
  sessionDate?: string;
  sessionOpen?: string;
  sessionClose?: string;
  calendar?: CommoditiesSessionCalendar;
  now?: Date;
  lossRatio?: number;
}

/** Lineup points for a daily leg: pct × 10 (full credit up, losses × lossRatio), rounded to int. */
export function pctReturnToLineupPoints(
  pctReturn: number,
  lossRatio = COMMODITIES_LOSS_RATIO,
): number {
  const weighted = pctReturn >= 0 ? pctReturn : pctReturn * lossRatio;
  return Math.round(weighted * 10);
}

function scoreRoundLeg(
  fromPrice: number | null | undefined,
  toPrice: number | null | undefined,
  lossRatio: number,
  provisional: boolean,
): CommodityRoundScore {
  if (fromPrice == null || toPrice == null || fromPrice <= 0 || toPrice <= 0) {
    return { total: 0, pctReturn: 0, provisional };
  }

  const pctReturn = ((toPrice - fromPrice) / fromPrice) * 100;
  return {
    total: pctReturnToLineupPoints(pctReturn, lossRatio),
    pctReturn,
    provisional,
  };
}

function roundEndPrice(
  input: CommodityDailyScoreInput,
  roundNumber: number,
  isCurrentProvisional: boolean,
): number | null {
  if (isCurrentProvisional) {
    return input.currentPrice ?? null;
  }

  const dayClose = input.dayClosePrices[roundNumber - 1] ?? null;
  if (dayClose != null) {
    return dayClose;
  }

  if (roundNumber === COMMODITIES_ROUND_COUNT && input.isComplete) {
    return input.closePrice ?? null;
  }

  return null;
}

function roundStartPrice(
  input: CommodityDailyScoreInput,
  roundNumber: number,
  firstScorable: number | null,
): number | null {
  if (firstScorable != null && roundNumber === firstScorable) {
    return input.openPrice ?? null;
  }
  return input.dayClosePrices[roundNumber - 2] ?? null;
}

function resolveSessionBounds(input: CommodityDailyScoreInput): CommoditiesSessionBounds | null {
  if (!input.sessionOpen || !input.sessionClose) {
    return null;
  }
  return resolveCommoditiesSessionBounds({
    sessionDate: input.sessionDate,
    sessionOpen: input.sessionOpen,
    sessionClose: input.sessionClose,
    calendar: input.calendar,
  });
}

/** Keep settled day closes stable; only the active day may refresh from market data. */
export function mergeLockedDayClosePrices(
  fresh: Array<number | null | undefined>,
  existing: Array<number | null | undefined> | null | undefined,
  sessionOpen: string,
  sessionClose: string,
  isComplete: boolean,
  now: Date = new Date(),
  calendar?: CommoditiesSessionCalendar,
  sessionDate?: string,
): Array<number | null> {
  const bounds = resolveCommoditiesSessionBounds({
    sessionDate,
    sessionOpen,
    sessionClose,
    calendar,
  });
  const locked = existing ?? [];
  const result: Array<number | null> = [];
  const dayCloses = buildSessionDayCloseTimestamps(bounds);
  const nowMs = now.getTime();

  for (let index = 0; index < COMMODITIES_ROUND_COUNT; index += 1) {
    const existingValue = locked[index];
    const freshValue = fresh[index] ?? null;
    const hasExisting =
      existingValue != null && Number.isFinite(existingValue) && existingValue > 0;
    const daySettled = isComplete || nowMs >= dayCloses[index]!;

    if (daySettled && hasExisting) {
      result.push(existingValue);
      continue;
    }

    if (daySettled && freshValue != null && Number.isFinite(freshValue) && freshValue > 0) {
      result.push(freshValue);
      continue;
    }

    result.push(freshValue);
  }

  return result;
}

function resolveScoringPeriod(input: CommodityDailyScoreInput, now: Date): number {
  const bounds = resolveSessionBounds(input);
  if (bounds) {
    return commoditiesScoringPeriod(bounds, now);
  }
  if (input.currentPeriod != null) {
    return Math.min(COMMODITIES_ROUND_COUNT, Math.max(1, Math.round(input.currentPeriod)));
  }
  return 1;
}

function isBeforeSessionOpen(input: CommodityDailyScoreInput, now: Date): boolean {
  if (!input.sessionOpen) {
    return false;
  }
  return now.getTime() < new Date(input.sessionOpen).getTime();
}

export function transformCommodityDailyScores(
  input: CommodityDailyScoreInput,
): {
  total: number;
  rounds: CommodityRoundScore[];
  cumulativePctReturn: number | null;
} {
  const lossRatio = input.lossRatio ?? COMMODITIES_LOSS_RATIO;
  const now = input.now ?? new Date();
  const bounds = resolveSessionBounds(input);
  const scoringPeriod = resolveScoringPeriod(input, now);
  const firstScorable = bounds ? firstScorablePeriod(bounds) : null;

  if (isBeforeSessionOpen(input, now)) {
    const emptyRounds = Array.from({ length: COMMODITIES_ROUND_COUNT }, () => ({
      total: 0,
      pctReturn: null as number | null,
      provisional: false,
    }));
    return { total: 0, rounds: emptyRounds, cumulativePctReturn: null };
  }

  const rounds: CommodityRoundScore[] = [];

  for (let periodNumber = 1; periodNumber <= COMMODITIES_ROUND_COUNT; periodNumber += 1) {
    if (bounds && !isCommoditiesPeriodScorable(periodNumber, bounds)) {
      rounds.push({ total: 0, pctReturn: null, provisional: false });
      continue;
    }

    if (periodNumber > scoringPeriod) {
      rounds.push({ total: 0, pctReturn: 0, provisional: false });
      continue;
    }

    const isCurrentProvisional = periodNumber === scoringPeriod && !input.isComplete;
    const fromPrice = roundStartPrice(input, periodNumber, firstScorable);
    const toPrice = roundEndPrice(input, periodNumber, isCurrentProvisional);

    rounds.push(scoreRoundLeg(fromPrice, toPrice, lossRatio, isCurrentProvisional));
  }

  const total = rounds.reduce((sum, round) => sum + round.total, 0);

  const openPrice = input.openPrice ?? null;
  const effectiveClose = input.isComplete
    ? (input.closePrice ?? input.dayClosePrices[COMMODITIES_ROUND_COUNT - 1] ?? null)
    : (input.currentPrice ?? null);

  let cumulativePctReturn: number | null = null;
  if (openPrice != null && openPrice > 0 && effectiveClose != null && effectiveClose > 0) {
    cumulativePctReturn = ((effectiveClose - openPrice) / openPrice) * 100;
  }

  return { total, rounds, cumulativePctReturn };
}
