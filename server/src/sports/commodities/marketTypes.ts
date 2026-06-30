export type MarketQuote = {
  markPrice: number;
  oraclePrice?: number;
  prevDayPrice?: number;
  dayVolume?: number;
  bid?: number;
  ask?: number;
  changePercent?: number;
  syncedAt: string;
};

export type SessionPriceSnapshot = {
  openPrice: number | null;
  currentPrice: number | null;
  closePrice: number | null;
};
