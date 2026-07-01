export const COMMODITIES_SPORT_ID = "commodities" as const;

export type CommoditySector = "energy" | "precious" | "metals" | "ag" | "softs";

export interface CommodityFieldEntry {
  ticker: string;
  hlCoin: string;
  hlDex: string;
  displayName: string;
  sector: CommoditySector;
  iconKey: string;
}

export interface CommoditiesEventMetadata {
  /** Monday anchor date (YYYY-MM-DD) for the trading week. */
  sessionDate: string;
  /** ISO week externalId, e.g. 2026-W27. */
  sessionWeek?: string;
  weekNumber?: number;
  sessionOpen: string;
  sessionClose: string;
  /** Set by cron when session open time passes — gates LIVE status and contest activation. */
  sessionStarted?: boolean;
  sessionComplete?: boolean;
  /** Frozen catalog + HL coin mapping at init — authoritative for this event. */
  fieldSnapshot?: CommodityFieldEntry[];
}

export interface CommodityQuoteSnapshot {
  lastPrice?: number | null;
  open?: number | null;
  previousClose?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  bid?: number | null;
  ask?: number | null;
  volume?: number | null;
  changePercent?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  marketState?: string | null;
  syncedAt?: string;
}

export type CommodityPriceHistoryPoint = { t: number; c: number };

export interface CommodityParticipantMetadata {
  sector?: CommoditySector;
  iconKey?: string;
  symbol?: string;
  hlCoin?: string;
  hlDex?: string;
  /** Intraday candle closes with open timestamps (ms) from session open through now or session end. */
  priceHistory?: CommodityPriceHistoryPoint[] | number[];
  /** Latest quote snapshot for picker display. */
  quote?: CommodityQuoteSnapshot;
}

export interface CommodityRoundScoreData {
  total?: number | null;
  pctReturn?: number | null;
  provisional?: boolean;
}

export interface CommodityScoreData {
  openPrice?: number | null;
  currentPrice?: number | null;
  closePrice?: number | null;
  /** Raw cumulative % move Mon open → current/close (display only). */
  pctReturn?: number | null;
  provisional?: boolean;
  /** Asymmetric loss weight for down days (default 0.4). */
  lossRatio?: number | null;
  currentPeriod?: number | null;
  /** Locked Mon–Fri session close prices used for settled daily legs. */
  dayClosePrices?: Array<number | null>;
  r1?: CommodityRoundScoreData | null;
  r2?: CommodityRoundScoreData | null;
  r3?: CommodityRoundScoreData | null;
  r4?: CommodityRoundScoreData | null;
  r5?: CommodityRoundScoreData | null;
}

export function parseCommoditiesEventMetadata(metadata: unknown): CommoditiesEventMetadata | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const record = metadata as Record<string, unknown>;
  const block = record.commodities;
  if (!block || typeof block !== "object" || Array.isArray(block)) {
    return null;
  }

  const commodities = block as Record<string, unknown>;
  if (
    typeof commodities.sessionDate !== "string" ||
    typeof commodities.sessionOpen !== "string" ||
    typeof commodities.sessionClose !== "string"
  ) {
    return null;
  }

  const fieldSnapshot = parseFieldSnapshot(commodities.fieldSnapshot);

  return {
    sessionDate: commodities.sessionDate,
    sessionWeek: typeof commodities.sessionWeek === "string" ? commodities.sessionWeek : undefined,
    weekNumber: typeof commodities.weekNumber === "number" ? commodities.weekNumber : undefined,
    sessionOpen: commodities.sessionOpen,
    sessionClose: commodities.sessionClose,
    sessionStarted: commodities.sessionStarted === true,
    sessionComplete: commodities.sessionComplete === true,
    fieldSnapshot,
  };
}

function parseFieldSnapshot(value: unknown): CommodityFieldEntry[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const entries: CommodityFieldEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const row = item as Record<string, unknown>;
    if (
      typeof row.ticker !== "string" ||
      typeof row.hlCoin !== "string" ||
      typeof row.hlDex !== "string" ||
      typeof row.displayName !== "string" ||
      typeof row.sector !== "string" ||
      typeof row.iconKey !== "string"
    ) {
      continue;
    }
    entries.push({
      ticker: row.ticker,
      hlCoin: row.hlCoin,
      hlDex: row.hlDex,
      displayName: row.displayName,
      sector: row.sector as CommoditySector,
      iconKey: row.iconKey,
    });
  }

  return entries.length > 0 ? entries : undefined;
}

export function getEventFieldSnapshot(metadata: unknown): CommodityFieldEntry[] {
  const commodities = parseCommoditiesEventMetadata(metadata);
  return commodities?.fieldSnapshot ?? [];
}

export function parseCommodityParticipantMetadata(metadata: unknown): CommodityParticipantMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as CommodityParticipantMetadata;
}
