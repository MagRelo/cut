import type { DataGolfTourParam } from "./dataGolfFieldUpdates.js";

export type DataGolfFinishMarket = "top_5" | "top_10" | "top_20";

export interface DataGolfOutrightsOddsRow {
  dg_id: number;
  player_name: string;
  /** Listed decimal from DataGolf’s DraftKings scrape (same feed as `books_offering`). */
  draftkings?: number;
  datagolf?: { baseline?: number; baseline_history_fit?: number };
  [key: string]: unknown;
}

export interface DataGolfOutrightsPayload {
  event_name: string;
  last_updated: string;
  market: string;
  odds: DataGolfOutrightsOddsRow[];
}

function getApiKey(): string {
  const key = process.env.DATAGOLF_API_KEY?.trim();
  if (!key) throw new Error("DATAGOLF_API_KEY is not set");
  return key;
}

export async function fetchDataGolfOutrights(
  tour: DataGolfTourParam,
  market: DataGolfFinishMarket,
): Promise<DataGolfOutrightsPayload> {
  const url = new URL("https://feeds.datagolf.com/betting-tools/outrights");
  url.searchParams.set("tour", tour);
  url.searchParams.set("market", market);
  url.searchParams.set("odds_format", "decimal");
  url.searchParams.set("file_format", "json");
  url.searchParams.set("key", getApiKey());

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`DataGolf outrights HTTP ${res.status}`);
  }
  const json = (await res.json()) as DataGolfOutrightsPayload;
  if (!json?.odds || !Array.isArray(json.odds)) {
    throw new Error("DataGolf outrights: invalid payload");
  }
  return json;
}

/**
 * DataGolf `datagolf.baseline` (model / de-vig). Kept for diagnostics or future pricing modes.
 */
export function pickBaselineDecimal(row: DataGolfOutrightsOddsRow): number | null {
  const b = row.datagolf?.baseline;
  if (typeof b !== "number" || !Number.isFinite(b) || b <= 1) return null;
  return b;
}

/** DraftKings decimal from the outrights row (`draftkings` field in DataGolf JSON). */
export function pickDraftKingsDecimal(row: DataGolfOutrightsOddsRow): number | null {
  const d = row.draftkings;
  if (typeof d !== "number" || !Number.isFinite(d) || d <= 1) return null;
  return d;
}

export function oddsRowsByDgId(rows: DataGolfOutrightsOddsRow[]): Map<number, DataGolfOutrightsOddsRow> {
  const m = new Map<number, DataGolfOutrightsOddsRow>();
  for (const row of rows) {
    if (typeof row.dg_id === "number") m.set(row.dg_id, row);
  }
  return m;
}
