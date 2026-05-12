export type DataGolfTourParam = "pga" | "opp";

export interface DataGolfFieldRow {
  dg_id: number;
  player_num: number;
  player_name: string;
}

export interface DataGolfFieldUpdatesPayload {
  tour: string;
  event_id: number;
  event_name: string;
  last_updated: string;
  field: DataGolfFieldRow[];
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
