import { parseF1SessionExternalId } from "./externalId.js";

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

export type OpenF1Session = {
  session_key: number;
  meeting_key: number;
  year: number;
  session_name: string;
  session_type: string;
  country_name: string;
  circuit_short_name: string;
  date_start: string;
  date_end: string;
};

export type OpenF1Driver = {
  driver_number: number;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
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

export type JolpicaDriverStanding = {
  position: string;
  wins: string;
  Driver: {
    permanentNumber?: string;
  };
};

export type DriverSeasonStanding = {
  championshipPosition: number;
  seasonWins: number;
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
      let detail = "";
      try {
        const body = (await res.json()) as { detail?: string };
        if (body.detail) detail = ` — ${body.detail}`;
      } catch {
        // ignore non-JSON error bodies
      }
      throw new Error(`HTTP ${res.status} for ${url}${detail}`);
    }
    return res.json() as Promise<T>;
  }
  throw new Error(`Failed after retries: ${url}`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRaceSession(session: OpenF1Session): boolean {
  return session.session_type === "Race" || session.session_name === "Race";
}

function utcCalendarDate(isoDate: string): string {
  return isoDate.slice(0, 10);
}

export function matchJolpicaRaceByDate(
  races: JolpicaRace[],
  raceDateUtc: string,
): JolpicaRace | null {
  return races.find((race) => utcCalendarDate(race.date) === raceDateUtc) ?? null;
}

export async function fetchJolpicaSeasonRaces(year: number): Promise<JolpicaRace[]> {
  const data = await fetchJson<{
    MRData: { RaceTable: { Races: JolpicaRace[] } };
  }>(`${JOLPICA_BASE}/${year}.json`);
  return data.MRData.RaceTable.Races;
}

export async function resolveJolpicaRaceBySessionDate(
  year: number,
  dateStart: string,
): Promise<JolpicaRace> {
  const races = await fetchJolpicaSeasonRaces(year);
  const raceDate = utcCalendarDate(dateStart);
  const race = matchJolpicaRaceByDate(races, raceDate);
  if (!race) {
    throw new Error(`No Jolpica race found for ${year} on ${raceDate}`);
  }
  return race;
}

export async function fetchSessionByKey(sessionKey: number): Promise<OpenF1Session> {
  const sessions = await fetchJson<OpenF1Session[]>(
    `${OPENF1_BASE}/sessions?session_key=${sessionKey}`,
  );
  const session = sessions[0];
  if (!session) {
    throw new Error(`No OpenF1 session for session_key ${sessionKey}`);
  }
  return session;
}

export async function fetchRaceSessionsForYear(year: number): Promise<OpenF1Session[]> {
  const sessions = await fetchJson<OpenF1Session[]>(
    `${OPENF1_BASE}/sessions?year=${year}&session_type=Race`,
  );
  return [...sessions].sort((a, b) => a.date_start.localeCompare(b.date_start));
}

function formatRaceName(session: OpenF1Session): string {
  const country = session.country_name?.trim();
  if (country) {
    return `${country} Grand Prix`;
  }
  return session.session_name;
}

export async function resolveRaceContext(externalId: string): Promise<ResolvedRaceContext> {
  const sessionKey = parseF1SessionExternalId(externalId);
  const session = await fetchSessionByKey(sessionKey);

  if (!isRaceSession(session)) {
    throw new Error(
      `session_key ${sessionKey} is "${session.session_name}" (${session.session_type}), not a Race session`,
    );
  }

  await delay(300);
  const jolpicaRace = await resolveJolpicaRaceBySessionDate(session.year, session.date_start);

  return {
    season: session.year,
    round: Number(jolpicaRace.round),
    meetingKey: session.meeting_key,
    sessionKey: session.session_key,
    circuitId: jolpicaRace.Circuit.circuitId,
    raceName: jolpicaRace.raceName || formatRaceName(session),
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

export async function fetchJolpicaDriverStandings(
  season: number,
  round: number,
): Promise<JolpicaDriverStanding[]> {
  try {
    const data = await fetchJson<{
      MRData: {
        StandingsTable: {
          StandingsLists: Array<{ DriverStandings: JolpicaDriverStanding[] }>;
        };
      };
    }>(`${JOLPICA_BASE}/${season}/${round}/driverStandings.json`);
    const list = data.MRData.StandingsTable.StandingsLists[0];
    return list?.DriverStandings ?? [];
  } catch {
    return [];
  }
}

export function mapJolpicaStandingsByDriverNumber(
  standings: JolpicaDriverStanding[],
): Map<number, DriverSeasonStanding> {
  const map = new Map<number, DriverSeasonStanding>();
  for (const row of standings) {
    const driverNumber = Number.parseInt(row.Driver.permanentNumber ?? "", 10);
    const championshipPosition = Number.parseInt(row.position, 10);
    const seasonWins = Number.parseInt(row.wins, 10);
    if (!Number.isFinite(driverNumber) || !Number.isFinite(championshipPosition)) {
      continue;
    }
    map.set(driverNumber, {
      championshipPosition,
      seasonWins: Number.isFinite(seasonWins) ? seasonWins : 0,
    });
  }
  return map;
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
