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
  currentPeriod: number;
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
): number | null {
  if (roundNumber === 1) {
    return input.openPrice ?? null;
  }
  return input.dayClosePrices[roundNumber - 2] ?? null;
}

export function transformCommodityDailyScores(
  input: CommodityDailyScoreInput,
): {
  total: number;
  rounds: CommodityRoundScore[];
  cumulativePctReturn: number | null;
} {
  const lossRatio = input.lossRatio ?? COMMODITIES_LOSS_RATIO;
  const currentPeriod = Math.min(
    COMMODITIES_ROUND_COUNT,
    Math.max(1, Math.round(input.currentPeriod)),
  );

  const rounds: CommodityRoundScore[] = [];

  for (let periodNumber = 1; periodNumber <= COMMODITIES_ROUND_COUNT; periodNumber += 1) {
    if (periodNumber > currentPeriod) {
      rounds.push({ total: 0, pctReturn: 0, provisional: false });
      continue;
    }

    const isCurrentProvisional = periodNumber === currentPeriod && !input.isComplete;
    const fromPrice = roundStartPrice(input, periodNumber);
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

/** @deprecated Use pctReturnToLineupPoints */
export function asymmetricPctToTotal(pctReturn: number, lossRatio = COMMODITIES_LOSS_RATIO): number {
  return pctReturnToLineupPoints(pctReturn, lossRatio);
}
