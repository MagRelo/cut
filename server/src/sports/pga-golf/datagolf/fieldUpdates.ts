import { parse } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type DataGolfTourParam = "pga" | "opp";

/** `field-updates` / outrights tour: env `SIDE_BET_DATAGOLF_TOUR` (`pga` default, `opp` opposite field). */
export function dataGolfTourFromEnv(): DataGolfTourParam {
  const t = process.env.SIDE_BET_DATAGOLF_TOUR?.trim().toLowerCase();
  return t === "opp" ? "opp" : "pga";
}

export interface DataGolfTeeTime {
  round_num: number;
  teetime: string;
  wave?: string;
  start_hole?: number;
  course_name?: string;
}

export interface DataGolfFieldRow {
  dg_id: number;
  player_num: number;
  player_name: string;
  teetimes?: DataGolfTeeTime[];
}

export interface DataGolfFieldUpdatesPayload {
  tour: string;
  event_id: number;
  event_name: string;
  last_updated: string;
  field: DataGolfFieldRow[];
}

/** Persisted on `TournamentPlayer.teeTimes`. */
export interface TournamentPlayerTeeTime {
  roundNum: number;
  teetimeIso: string;
  label: string;
}

function getApiKey(): string {
  const key = process.env.DATAGOLF_API_KEY?.trim();
  if (!key) throw new Error("DATAGOLF_API_KEY is not set");
  return key;
}

export async function fetchDataGolfFieldUpdates(
  tour: DataGolfTourParam,
): Promise<DataGolfFieldUpdatesPayload> {
  const url = new URL("https://feeds.datagolf.com/field-updates");
  url.searchParams.set("tour", tour);
  url.searchParams.set("file_format", "json");
  url.searchParams.set("key", getApiKey());

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`DataGolf field-updates HTTP ${res.status}`);
  }
  const json = (await res.json()) as DataGolfFieldUpdatesPayload;
  if (!json?.field || !Array.isArray(json.field)) {
    throw new Error("DataGolf field-updates: invalid payload");
  }
  return json;
}

/** Map PGA tour player id string → DataGolf dg_id (ID-only; never use player_name). */
export function buildPgaTourIdToDgIdMap(field: DataGolfFieldRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const row of field) {
    if (typeof row.player_num !== "number" || typeof row.dg_id !== "number") continue;
    m.set(String(row.player_num), row.dg_id);
  }
  return m;
}

/** Map PGA tour player id string → raw DataGolf tee time rows. */
export function buildPgaTourIdToTeeTimesMap(field: DataGolfFieldRow[]): Map<string, DataGolfTeeTime[]> {
  const m = new Map<string, DataGolfTeeTime[]>();
  for (const row of field) {
    if (typeof row.player_num !== "number" || !Array.isArray(row.teetimes) || row.teetimes.length === 0) {
      continue;
    }
    m.set(String(row.player_num), row.teetimes);
  }
  return m;
}

/**
 * Format DataGolf `teetime` (`YYYY-MM-DD HH:mm`) in the tournament timezone for display.
 */
export function formatDataGolfTeeTimeLabel(teetime: string, timezone: string): string | null {
  const trimmed = teetime?.trim();
  if (!trimmed || !timezone?.trim()) return null;
  const parsed = parse(trimmed, "yyyy-MM-dd HH:mm", new Date());
  if (Number.isNaN(parsed.getTime())) return null;
  try {
    const utc = fromZonedTime(parsed, timezone);
    return formatInTimeZone(utc, timezone, "h:mm a");
  } catch {
    return null;
  }
}

export function buildStoredTeeTimes(
  teetimes: DataGolfTeeTime[],
  timezone: string,
): TournamentPlayerTeeTime[] {
  const result: TournamentPlayerTeeTime[] = [];
  for (const t of teetimes) {
    if (typeof t.round_num !== "number" || typeof t.teetime !== "string") continue;
    const label = formatDataGolfTeeTimeLabel(t.teetime, timezone);
    if (!label) continue;
    const parsed = parse(t.teetime.trim(), "yyyy-MM-dd HH:mm", new Date());
    if (Number.isNaN(parsed.getTime())) continue;
    let teetimeIso: string;
    try {
      teetimeIso = fromZonedTime(parsed, timezone).toISOString();
    } catch {
      continue;
    }
    result.push({ roundNum: t.round_num, teetimeIso, label });
  }
  return result.sort((a, b) => a.roundNum - b.roundNum);
}
