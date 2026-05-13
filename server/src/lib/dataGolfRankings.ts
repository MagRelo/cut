/**
 * Data Golf world rankings for tournament init (`pga_performance.dataGolfRanking`).
 * Uses the official feed only: https://feeds.datagolf.com/preds/get-dg-rankings
 * (see https://datagolf.com/api-access — Scratch Plus + `DATAGOLF_API_KEY`).
 */

export interface DataGolfRanking {
  dg_rank: number;
  dg_rank_change?: number;
  dg_skill?: number;
  dgp_rank?: number;
  dgp_rank_change?: number;
  player?: string;
  /** Normalized from API for `createPlayerNameLookup` (first + last). */
  first?: string;
  last?: string;
  dg_id?: number;
}

export interface DataGolfRankingsData {
  current_date?: string;
  /** Normalized ranking rows (stable shape for `initTournament`). */
  data?: DataGolfRanking[];
  rankings?: DataGolfRanking[];
  last_updated?: string;
}

interface CacheItem {
  data: DataGolfRankingsData;
  timestamp: number;
}

let cache: CacheItem | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getApiKey(): string {
  const key = process.env.DATAGOLF_API_KEY?.trim();
  if (!key) {
    throw new Error("DATAGOLF_API_KEY is not set (required for Data Golf rankings API)");
  }
  return key;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

/** Split "First Last" / "First Middle Last" into first + last for name lookup. */
function splitPlayerName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0] ?? "", last: "" };
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

function isRankingLikeRow(o: unknown): o is Record<string, unknown> {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  const r = o as Record<string, unknown>;
  const rank =
    asNumber(r.dg_rank) ??
    asNumber(r.rank) ??
    asNumber(r.dg_ord) ??
    asNumber(r.position);
  if (rank === undefined) return false;
  const hasName = Boolean(
    asString(r.player_name) ||
      asString(r.name) ||
      asString(r.player) ||
      (asString(r.first) && asString(r.last)),
  );
  const hasDgId = asNumber(r.dg_id) !== undefined;
  return hasName || hasDgId;
}

function extractRankingsArray(payload: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(payload)) {
    return payload.every((x) => x && typeof x === "object") ? (payload as Record<string, unknown>[]) : null;
  }
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;

  const directKeys = ["rankings", "data", "baseline", "dg_rankings", "results", "players"] as const;
  for (const k of directKeys) {
    const v = root[k];
    if (Array.isArray(v) && v.length > 0 && isRankingLikeRow(v[0])) {
      return v as Record<string, unknown>[];
    }
  }

  for (const v of Object.values(root)) {
    if (!Array.isArray(v) || v.length === 0) continue;
    if (isRankingLikeRow(v[0])) return v as Record<string, unknown>[];
  }

  return null;
}

function normalizeApiRow(raw: Record<string, unknown>): DataGolfRanking | null {
  const dg_rank =
    asNumber(raw.dg_rank) ?? asNumber(raw.rank) ?? asNumber(raw.dg_ord) ?? asNumber(raw.position);
  if (dg_rank === undefined) return null;
  const dg_skill =
    asNumber(raw.dg_skill) ??
    asNumber(raw.skill) ??
    asNumber(raw.skill_estimate) ??
    asNumber(raw.pred_skill);
  const dgp_rank =
    asNumber(raw.dgp_rank) ??
    asNumber(raw.owgr_rank) ??
    asNumber(raw.owgr) ??
    asNumber(raw.world_rank);
  const dg_rank_change = asNumber(raw.dg_rank_change) ?? asNumber(raw.rank_change);
  const dgp_rank_change = asNumber(raw.dgp_rank_change) ?? asNumber(raw.owgr_change);

  const firstIn = asString(raw.first);
  const lastIn = asString(raw.last);
  const playerName =
    asString(raw.player_name) ?? asString(raw.name) ?? asString(raw.player) ?? (firstIn && lastIn ? `${firstIn} ${lastIn}` : undefined);

  let first = firstIn;
  let last = lastIn;
  let player = playerName;
  if ((!first || !last) && playerName) {
    const sp = splitPlayerName(playerName);
    first = first || sp.first;
    last = last || sp.last;
    player = player || playerName;
  }

  const dgId = asNumber(raw.dg_id);

  if (!(player?.trim() || (first?.trim() && last?.trim()))) {
    if (dgId === undefined) return null;
    return {
      dg_rank,
      ...(dg_skill !== undefined ? { dg_skill } : {}),
      ...(dgp_rank !== undefined ? { dgp_rank } : {}),
      ...(dg_rank_change !== undefined ? { dg_rank_change } : {}),
      ...(dgp_rank_change !== undefined ? { dgp_rank_change } : {}),
      dg_id: dgId,
    };
  }

  return {
    dg_rank,
    ...(dg_skill !== undefined ? { dg_skill } : {}),
    ...(dgp_rank !== undefined ? { dgp_rank } : {}),
    ...(dg_rank_change !== undefined ? { dg_rank_change } : {}),
    ...(dgp_rank_change !== undefined ? { dgp_rank_change } : {}),
    ...(player ? { player } : {}),
    ...(first ? { first } : {}),
    ...(last ? { last } : {}),
    ...(dgId !== undefined ? { dg_id: dgId } : {}),
  };
}

function buildRankingsData(payload: unknown): DataGolfRankingsData {
  const rows = extractRankingsArray(payload);
  if (!rows || rows.length === 0) {
    throw new Error("Data Golf get-dg-rankings: could not find a rankings array in the response");
  }

  const normalized: DataGolfRanking[] = [];
  for (const raw of rows) {
    const n = normalizeApiRow(raw);
    if (n) normalized.push(n);
  }
  if (normalized.length === 0) {
    throw new Error("Data Golf get-dg-rankings: no valid ranking rows after normalization");
  }

  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : {};

  const result: DataGolfRankingsData = { data: normalized };
  const current_date = asString(root.current_date);
  if (current_date !== undefined) result.current_date = current_date;
  const last_updated = asString(root.last_updated);
  if (last_updated !== undefined) result.last_updated = last_updated;

  return result;
}

/**
 * Rankings rows keyed by DataGolf `dg_id` (join with `buildPgaTourIdToDgIdMap` from field-updates).
 */
export function buildDgIdToRankingMap(rankings: DataGolfRanking[]): Map<number, DataGolfRanking> {
  const m = new Map<number, DataGolfRanking>();
  for (const r of rankings) {
    if (typeof r.dg_id === "number") m.set(r.dg_id, r);
  }
  return m;
}

/**
 * Fetches current Data Golf model rankings from the official API (one request, cached 5 minutes).
 */
export async function fetchDataGolfRankings(): Promise<DataGolfRankingsData> {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_DURATION) {
    return cache.data;
  }

  const key = getApiKey();
  const url = new URL("https://feeds.datagolf.com/preds/get-dg-rankings");
  url.searchParams.set("file_format", "json");
  url.searchParams.set("key", key);

  const response = await fetch(url.toString());

  const text = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    if (!response.ok || text.includes("invalid api key")) {
      throw new Error(
        text.length < 200 ? text.trim() : `Data Golf rankings request failed (HTTP ${response.status})`,
      );
    }
    throw new Error("Data Golf get-dg-rankings: response was not valid JSON");
  }

  if (!response.ok) {
    switch (response.status) {
      case 429:
        throw new Error("Data Golf API rate limit exceeded; wait before retrying.");
      case 403:
        throw new Error("Data Golf API access forbidden; check DATAGOLF_API_KEY.");
      default:
        throw new Error(`Data Golf get-dg-rankings HTTP ${response.status}`);
    }
  }

  const data = buildRankingsData(json);
  cache = { data, timestamp: now };
  return data;
}
