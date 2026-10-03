import { parsePlayerNameParts } from "../../../lib/dataGolfRankings.js";
import { dataGolfTourFromEnv, type DataGolfTourParam } from "./fieldUpdates.js";

const MODEL_KEY = /^(datagolf|dg_|pred|model|player|name|id|event)/i;

export type SourcedPlayerOdds = {
  playerName: string;
  displayName: string;
  quotes: number[];
  low: number;
  high: number;
};

export type DataGolfOutrightsBoard = {
  eventName: string;
  eventId?: number | string | undefined;
  players: SourcedPlayerOdds[];
};

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/** Lower decimal = shorter price (favorite). */
export function americanToDecimal(american: number): number {
  if (american < 0) return 1 + 100 / Math.abs(american);
  return 1 + american / 100;
}

export function formatAmericanOdds(american: number): string {
  const rounded = Math.round(american);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

export function formatPlayerOddsLabel(playerName: string, quotes: readonly number[]): string {
  if (quotes.length === 0) return `${playerName}:`;
  const sorted = [...quotes].sort((a, b) => americanToDecimal(a) - americanToDecimal(b));
  const short = sorted[0]!;
  const long = sorted[sorted.length - 1]!;
  if (sorted.length === 1 || short === long) {
    return `${playerName} (${formatAmericanOdds(short)}):`;
  }
  return `${playerName} (${formatAmericanOdds(short)} to ${formatAmericanOdds(long)}):`;
}

export function normalizeEventName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function eventNamesMatch(a: string, b: string): boolean {
  const left = normalizeEventName(a);
  const right = normalizeEventName(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function nestedBookQuote(value: Record<string, unknown>): number | undefined {
  return asNumber(value.odds) ?? asNumber(value.price) ?? asNumber(value.american);
}

function collectBookQuotes(row: Record<string, unknown>): number[] {
  const quotes: number[] = [];
  for (const [key, value] of Object.entries(row)) {
    if (MODEL_KEY.test(key)) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = nestedBookQuote(value as Record<string, unknown>);
      if (nested !== undefined) quotes.push(nested);
      continue;
    }
    const n = asNumber(value);
    if (n === undefined) continue;
    quotes.push(n);
  }
  return quotes;
}

function parseOddsRow(row: unknown): SourcedPlayerOdds | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const rec = row as Record<string, unknown>;
  const rawName =
    asString(rec.player_name) ??
    asString(rec.player) ??
    asString(rec.name) ??
    (asString(rec.first) && asString(rec.last) ? `${rec.first} ${rec.last}` : undefined);
  if (!rawName) return null;
  const quotes = collectBookQuotes(rec);
  if (quotes.length === 0) {
    return {
      playerName: rawName,
      displayName: parsePlayerNameParts(rawName).display,
      quotes: [],
      low: 0,
      high: 0,
    };
  }
  const sorted = [...quotes].sort((a, b) => americanToDecimal(a) - americanToDecimal(b));
  return {
    playerName: rawName,
    displayName: parsePlayerNameParts(rawName).display,
    quotes,
    low: sorted[0]!,
    high: sorted[sorted.length - 1]!,
  };
}

function extractOddsRows(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  for (const key of ["odds", "data", "players", "outrights"]) {
    const value = root[key];
    if (Array.isArray(value) && value.length > 0) return value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = extractOddsRows(value);
      if (nested) return nested;
    }
  }
  return null;
}

export function parseDataGolfOutrightsPayload(payload: unknown): DataGolfOutrightsBoard | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const eventName =
    asString(root.event_name) ?? asString(root.eventName) ?? asString(root.tournament) ?? "";
  const eventId = root.event_id ?? root.eventId;
  const rows = extractOddsRows(payload);
  if (!rows) return null;
  const players = rows.map(parseOddsRow).filter((row): row is SourcedPlayerOdds => row != null);
  return {
    eventName,
    eventId: typeof eventId === "number" || typeof eventId === "string" ? eventId : undefined,
    players,
  };
}

export function matchOutrightsToEvent(
  board: DataGolfOutrightsBoard | null,
  eventName: string,
): DataGolfOutrightsBoard | null {
  if (!board) return null;
  if (!board.eventName) return null;
  if (!eventNamesMatch(board.eventName, eventName)) return null;
  return board;
}

function getApiKey(): string | null {
  const key = process.env.DATAGOLF_API_KEY?.trim();
  return key || null;
}

export async function fetchDataGolfOutrightWinOdds(
  tour: DataGolfTourParam = dataGolfTourFromEnv(),
): Promise<DataGolfOutrightsBoard | null> {
  const key = getApiKey();
  if (!key) return null;

  const url = new URL("https://feeds.datagolf.com/betting-tools/outrights");
  url.searchParams.set("tour", tour);
  url.searchParams.set("market", "win");
  url.searchParams.set("odds_format", "american");
  url.searchParams.set("file_format", "json");
  url.searchParams.set("key", key);

  const response = await fetch(url.toString());
  const text = await response.text();
  if (!response.ok) {
    console.warn(`[datagolf] outright odds HTTP ${response.status}: ${text.slice(0, 180)}`);
    return null;
  }
  try {
    return parseDataGolfOutrightsPayload(JSON.parse(text) as unknown);
  } catch {
    console.warn("[datagolf] outright odds response was not valid JSON");
    return null;
  }
}

export function findPlayerOdds(
  board: DataGolfOutrightsBoard | null,
  displayName: string,
): SourcedPlayerOdds | null {
  if (!board) return null;
  const needle = parsePlayerNameParts(displayName).display.toLowerCase();
  for (const player of board.players) {
    if (player.displayName.toLowerCase() === needle) return player;
    if (player.displayName.toLowerCase().includes(needle) || needle.includes(player.displayName.toLowerCase())) {
      return player;
    }
  }
  return null;
}
