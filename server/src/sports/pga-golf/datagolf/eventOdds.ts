import { parsePlayerNameParts } from "../../../lib/dataGolfRankings.js";
import { dataGolfTourFromEnv, type DataGolfTourParam } from "./fieldUpdates.js";
import { eventNamesMatch } from "./outrightOdds.js";

const CACHE_MS = 5 * 60 * 1000;

export type EventOddsSource = "live" | "pre-tournament";

export type EventOddsPlayer = {
  dgId: number | null;
  playerName: string;
  displayName: string;
  country: string | null;
  win: number | null;
  top5: number | null;
  top10: number | null;
};

export type EventOddsBoard = {
  source: EventOddsSource;
  eventName: string;
  updatedAt: string;
  deadHeats: boolean;
  players: EventOddsPlayer[];
};

export class EventOddsUnavailableError extends Error {
  constructor(message = "Odds are not available") {
    super(message);
    this.name = "EventOddsUnavailableError";
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Decimal odds. A missing or non-positive price is null. */
export function parseDecimalOdds(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function playerFromRow(row: unknown): EventOddsPlayer | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const playerName = asString(rec.player_name) ?? asString(rec.player) ?? asString(rec.name);
  if (!playerName) return null;
  const dgId = typeof rec.dg_id === "number" && Number.isFinite(rec.dg_id) ? rec.dg_id : null;
  return {
    dgId,
    playerName,
    displayName: parsePlayerNameParts(playerName).display,
    country: asString(rec.country) ?? null,
    win: parseDecimalOdds(rec.win),
    top5: parseDecimalOdds(rec.top_5),
    top10: parseDecimalOdds(rec.top_10),
  };
}

export function sortOddsPlayers(players: EventOddsPlayer[]): EventOddsPlayer[] {
  return [...players].sort((a, b) => {
    if (a.win == null && b.win == null) return 0;
    if (a.win == null) return 1;
    if (b.win == null) return -1;
    return a.win - b.win;
  });
}

function playersFrom(rows: unknown): EventOddsPlayer[] {
  if (!Array.isArray(rows)) return [];
  return sortOddsPlayers(rows.map(playerFromRow).filter((row): row is EventOddsPlayer => row != null));
}

export function parseLiveOddsPayload(payload: unknown): EventOddsBoard | null {
  const root = asRecord(payload);
  if (!root) return null;
  const info = asRecord(root.info);
  const eventName = asString(info?.event_name) ?? "";
  if (!eventName) return null;
  const players = playersFrom(root.data);
  if (players.length === 0) return null;
  return {
    source: "live",
    eventName,
    updatedAt: asString(info?.last_update) ?? "",
    deadHeats: asString(info?.dead_heat_rules)?.toLowerCase() === "yes",
    players,
  };
}

export function parsePreTournamentOddsPayload(payload: unknown): EventOddsBoard | null {
  const root = asRecord(payload);
  if (!root) return null;
  const eventName = asString(root.event_name) ?? "";
  if (!eventName) return null;
  const players = playersFrom(root.baseline_history_fit);
  if (players.length === 0) return null;
  return {
    source: "pre-tournament",
    eventName,
    updatedAt: asString(root.last_updated) ?? "",
    deadHeats: asString(root.dead_heats)?.toLowerCase() === "yes",
    players,
  };
}

/** Live prices when that board is this event. Otherwise the course-fit pre-tournament board. */
export function chooseOddsBoard(
  eventName: string,
  live: EventOddsBoard | null,
  pre: EventOddsBoard | null,
): EventOddsBoard | null {
  if (live && eventNamesMatch(live.eventName, eventName)) return live;
  if (pre && eventNamesMatch(pre.eventName, eventName)) return pre;
  return null;
}

function apiKey(): string {
  const key = process.env.DATAGOLF_API_KEY?.trim();
  if (!key) throw new EventOddsUnavailableError("Odds are not available");
  return key;
}

type CacheEntry = { at: number; board: EventOddsBoard };

const cache = new Map<string, CacheEntry>();

async function fetchBoard(
  cacheKey: string,
  path: string,
  params: Record<string, string>,
  parse: (payload: unknown) => EventOddsBoard | null,
  tour: DataGolfTourParam,
): Promise<EventOddsBoard | null> {
  const key = `${cacheKey}:${tour}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.board;

  const url = new URL(`https://feeds.datagolf.com${path}`);
  url.searchParams.set("tour", tour);
  url.searchParams.set("dead_heat", "yes");
  url.searchParams.set("odds_format", "decimal");
  url.searchParams.set("file_format", "json");
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set("key", apiKey());

  const response = await fetch(url);
  if (!response.ok) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(await response.text()) as unknown;
  } catch {
    return null;
  }
  const board = parse(payload);
  if (!board) return null;
  cache.set(key, { at: Date.now(), board });
  return board;
}

export function fetchLiveOddsBoard(tour: DataGolfTourParam = dataGolfTourFromEnv()): Promise<EventOddsBoard | null> {
  return fetchBoard("live", "/preds/in-play", {}, parseLiveOddsPayload, tour);
}

export function fetchPreTournamentOddsBoard(
  tour: DataGolfTourParam = dataGolfTourFromEnv(),
): Promise<EventOddsBoard | null> {
  return fetchBoard("pre", "/preds/pre-tournament", {}, parsePreTournamentOddsPayload, tour);
}

/** Test hook. */
export function clearEventOddsCache(): void {
  cache.clear();
}
