import type { CommodityScoreData } from "./metadata.js";

export function pctReturnToTotal(pctReturn: number): number {
  const displayScore = pctReturn * 10;
  return Math.round(displayScore * 10);
}

export function totalToDisplayScore(total: number): number {
  return total / 10;
}

export interface CommodityPriceInput {
  openPrice: number | null | undefined;
  currentPrice: number | null | undefined;
  closePrice?: number | null;
  provisional: boolean;
}

export interface CommodityParticipantScoreUpdate {
  total: number;
  scoreData: CommodityScoreData;
}

export function transformCommodityPrice(
  input: CommodityPriceInput,
): CommodityParticipantScoreUpdate {
  const openPrice = input.openPrice ?? null;
  const currentPrice = input.currentPrice ?? null;
  const closePrice = input.closePrice ?? null;
  const effectivePrice = closePrice ?? currentPrice;

  if (openPrice == null || openPrice <= 0 || effectivePrice == null || effectivePrice <= 0) {
    return {
      total: 0,
      scoreData: {
        openPrice,
        currentPrice,
        closePrice,
        pctReturn: 0,
        provisional: input.provisional,
      },
    };
  }

  const pctReturn = ((effectivePrice - openPrice) / openPrice) * 100;
  const total = pctReturnToTotal(pctReturn);

  return {
    total,
    scoreData: {
      openPrice,
      currentPrice,
      closePrice,
      pctReturn,
      provisional: input.provisional,
    },
  };
}
