export const COMMODITIES_SPORT_ID = "commodities" as const;

export type CommoditySector = "energy" | "precious" | "metals" | "ag" | "softs";

export interface CommoditiesEventMetadata {
  sessionDate: string;
  sessionOpen: string;
  sessionClose: string;
  sessionComplete?: boolean;
  /** ISO timestamp when 6-week picker sparklines were last synced for this event. */
  priceHistorySyncedAt?: string;
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

export interface CommodityParticipantMetadata {
  sector?: CommoditySector;
  iconKey?: string;
  symbol?: string;
  /** Last ~30 daily closes for picker sparklines. */
  priceHistory?: number[];
  /** Latest quote snapshot for picker display. */
  quote?: CommodityQuoteSnapshot;
}

export interface CommodityScoreData {
  openPrice?: number | null;
  currentPrice?: number | null;
  closePrice?: number | null;
  pctReturn?: number | null;
  provisional?: boolean;
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

  return {
    sessionDate: commodities.sessionDate,
    sessionOpen: commodities.sessionOpen,
    sessionClose: commodities.sessionClose,
    sessionComplete: commodities.sessionComplete === true,
    priceHistorySyncedAt:
      typeof commodities.priceHistorySyncedAt === "string"
        ? commodities.priceHistorySyncedAt
        : undefined,
  };
}
