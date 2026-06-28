import { CIRCUIT_SLUG_TO_ID, parseF1ExternalId } from "./circuitSlugs.js";

const JOLPICA_BASE = process.env.JOLPICA_BASE_URL ?? "https://api.jolpi.ca/ergast/f1";
const OPENF1_BASE = "https://api.openf1.org/v1";

export type JolpicaRace = {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: { circuitId: string; circuitName: string };
};

export type OpenF1Meeting = {
  meeting_key: number;
  meeting_name: string;
  circuit_short_name: string;
  country_name: string;
  date_start: string;
  date_end: string;
};

export type OpenF1Session = {
  session_key: number;
  session_name: string;
  date_start: string;
  date_end: string;
};

export type OpenF1Driver = {
  driver_number: number;
  full_name: string;
  team_name: string;
  team_colour: string;
  headshot_url?: string | null;
  country_code?: string | null;
};

export type OpenF1StartingGrid = {
  driver_number: number;
  position: number;
};

export type OpenF1Position = {
  driver_number: number;
  position: number;
  date: string;
  number_of_laps?: number | null;
};

export type OpenF1SessionResult = {
  position: number;
  driver_number: number;
  points: number;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  number_of_laps?: number | null;
};

export type OpenF1ChampionshipDriver = {
  driver_number: number;
  position_current?: number | null;
};

export type ResolvedRaceContext = {
  season: number;
  round: number;
  meetingKey: number;
  sessionKey: number;
  circuitId: string;
  raceName: string;
  raceStart: string;
  raceEnd: string;
};

function openF1Headers(): Record<string, string> {
  const token = process.env.OPENF1_API_TOKEN?.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchJson<T>(url: string, retries = 3): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers: openF1Headers() });
    if (res.status === 429 && attempt < retries) {
      await delay(1000 * (attempt + 1));
      continue;
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return res.json() as Promise<T>;
  }
  throw new Error(`Failed after retries: ${url}`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function resolveJolpicaRace(year: number, circuitSlug: string): Promise<JolpicaRace> {
  const circuitId = CIRCUIT_SLUG_TO_ID[circuitSlug];
  if (!circuitId) {
    throw new Error(`Unknown circuit slug "${circuitSlug}" — add to CIRCUIT_SLUG_TO_ID`);
  }

  const data = await fetchJson<{
    MRData: { RaceTable: { Races: JolpicaRace[] } };
  }>(`${JOLPICA_BASE}/${year}.json`);

  const race = data.MRData.RaceTable.Races.find((r) => r.Circuit.circuitId === circuitId);
  if (!race) {
    throw new Error(`No ${year} race found for circuitId ${circuitId}`);
  }
  return race;
}

export async function resolveOpenF1Meeting(year: number, circuitSlug: string): Promise<OpenF1Meeting> {
  const meetings = await fetchJson<OpenF1Meeting[]>(`${OPENF1_BASE}/meetings?year=${year}`);
  const circuitId = CIRCUIT_SLUG_TO_ID[circuitSlug];

  const meeting = meetings.find((m) => {
    const name = m.meeting_name.toLowerCase();
    const circuit = m.circuit_short_name.toLowerCase();
    return (
      name.includes(circuitSlug.replace(/-/g, " ")) ||
      (circuitId && circuit.includes(circuitId.replace(/_/g, ""))) ||
      (circuitSlug === "british" && m.country_name === "United Kingdom")
    );
  });

  if (!meeting) {
    throw new Error(`No OpenF1 meeting for ${year} / ${circuitSlug}`);
  }
  return meeting;
}

export async function fetchRaceSession(meetingKey: number): Promise<OpenF1Session> {
  const sessions = await fetchJson<OpenF1Session[]>(
    `${OPENF1_BASE}/sessions?meeting_key=${meetingKey}&session_name=Race`,
  );
  if (!sessions.length) {
    throw new Error(`No Race session for meeting_key ${meetingKey}`);
  }
  const session = sessions[0];
  if (!session) {
    throw new Error(`No Race session for meeting_key ${meetingKey}`);
  }
  return session;
}

export async function resolveRaceContext(externalId: string): Promise<ResolvedRaceContext> {
  const { year, circuitSlug } = parseF1ExternalId(externalId);
  const jolpicaRace = await resolveJolpicaRace(year, circuitSlug);
  const meeting = await resolveOpenF1Meeting(year, circuitSlug);
  await delay(500);
  const session = await fetchRaceSession(meeting.meeting_key);

  return {
    season: year,
    round: Number(jolpicaRace.round),
    meetingKey: meeting.meeting_key,
    sessionKey: session.session_key,
    circuitId: jolpicaRace.Circuit.circuitId,
    raceName: jolpicaRace.raceName,
    raceStart: session.date_start,
    raceEnd: session.date_end,
  };
}

export async function fetchDrivers(sessionKey: number): Promise<OpenF1Driver[]> {
  return fetchJson<OpenF1Driver[]>(`${OPENF1_BASE}/drivers?session_key=${sessionKey}`);
}

export async function fetchStartingGrid(sessionKey: number): Promise<OpenF1StartingGrid[]> {
  try {
    return await fetchJson<OpenF1StartingGrid[]>(
      `${OPENF1_BASE}/starting_grid?session_key=${sessionKey}`,
    );
  } catch {
    return [];
  }
}

export async function fetchChampionshipDrivers(
  sessionKey: number,
): Promise<OpenF1ChampionshipDriver[]> {
  try {
    return await fetchJson<OpenF1ChampionshipDriver[]>(
      `${OPENF1_BASE}/championship_drivers?session_key=${sessionKey}`,
    );
  } catch {
    return [];
  }
}

export async function fetchSessionResults(sessionKey: number): Promise<OpenF1SessionResult[]> {
  try {
    return await fetchJson<OpenF1SessionResult[]>(
      `${OPENF1_BASE}/session_result?session_key=${sessionKey}`,
    );
  } catch {
    return [];
  }
}

export async function fetchLatestPositions(sessionKey: number): Promise<OpenF1Position[]> {
  try {
    const rows = await fetchJson<OpenF1Position[]>(
      `${OPENF1_BASE}/position?session_key=${sessionKey}`,
    );
    const latestByDriver = new Map<number, OpenF1Position>();
    for (const row of rows) {
      const existing = latestByDriver.get(row.driver_number);
      if (!existing || row.date > existing.date) {
        latestByDriver.set(row.driver_number, row);
      }
    }
    return [...latestByDriver.values()];
  } catch {
    return [];
  }
}

export function driverExternalId(driverNumber: number): string {
  return String(driverNumber);
}

export function parseDriverExternalId(externalId: string | null | undefined): number | null {
  if (!externalId) return null;
  const parsed = Number.parseInt(externalId, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
