/**
 * Stage 2 data spike — fetch schedule, field, and results for an F1 externalId.
 * Usage: pnpm --filter server run script:f1-data-spike 2024-british-gp
 */

const JOLPICA_BASE = process.env.JOLPICA_BASE_URL ?? "https://api.jolpi.ca/ergast/f1";
const OPENF1_BASE = "https://api.openf1.org/v1";

/** Maps externalId circuit slug → Jolpica circuitId */
const CIRCUIT_SLUG_TO_ID: Record<string, string> = {
  british: "silverstone",
  monaco: "monaco",
  italian: "monza",
  belgian: "spa",
  hungarian: "hungaroring",
  dutch: "zandvoort",
  japanese: "suzuka",
  qatar: "losail",
  "united-states": "americas",
  brazilian: "interlagos",
  "las-vegas": "vegas",
  "abu-dhabi": "yas_marina",
  australian: "albert_park",
  chinese: "shanghai",
  bahrain: "bahrain",
  saudi: "jeddah",
  miami: "miami",
  emilia: "imola",
  canadian: "villeneuve",
  spanish: "catalunya",
  austrian: "red_bull_ring",
  azerbaijan: "baku",
  singapore: "marina_bay",
};

type JolpicaRace = {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: { circuitId: string; circuitName: string };
};

type OpenF1Meeting = {
  meeting_key: number;
  meeting_name: string;
  circuit_short_name: string;
  country_name: string;
  date_start: string;
  date_end: string;
};

type OpenF1Session = {
  session_key: number;
  session_name: string;
  date_start: string;
  date_end: string;
};

type OpenF1Driver = {
  driver_number: number;
  full_name: string;
  team_name: string;
  team_colour: string;
};

type OpenF1SessionResult = {
  position: number;
  driver_number: number;
  points: number;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
};

async function fetchJson<T>(url: string, retries = 3): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url);
    if (res.status === 429 && attempt < retries) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return res.json() as Promise<T>;
  }
  throw new Error(`Failed after retries: ${url}`);
}

function parseExternalId(externalId: string): { year: number; circuitSlug: string } {
  const match = /^(\d{4})-(.+)-gp$/.exec(externalId);
  if (!match) {
    throw new Error(`Invalid externalId "${externalId}" — expected {year}-{circuit-slug}-gp`);
  }
  return { year: Number(match[1]), circuitSlug: match[2] };
}

async function resolveJolpicaRace(year: number, circuitSlug: string): Promise<JolpicaRace> {
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

async function resolveOpenF1Meeting(year: number, circuitSlug: string): Promise<OpenF1Meeting> {
  const meetings = await fetchJson<OpenF1Meeting[]>(`${OPENF1_BASE}/meetings?year=${year}`);
  const circuitId = CIRCUIT_SLUG_TO_ID[circuitSlug];

  const race = meetings.find((m) => {
    const name = m.meeting_name.toLowerCase();
    const circuit = m.circuit_short_name.toLowerCase();
    return (
      name.includes(circuitSlug.replace(/-/g, " ")) ||
      (circuitId && circuit.includes(circuitId.replace(/_/g, ""))) ||
      (circuitSlug === "british" && m.country_name === "United Kingdom")
    );
  });

  if (!race) {
    throw new Error(`No OpenF1 meeting for ${year} / ${circuitSlug}`);
  }
  return race;
}

async function fetchRaceSession(meetingKey: number): Promise<OpenF1Session> {
  const sessions = await fetchJson<OpenF1Session[]>(
    `${OPENF1_BASE}/sessions?meeting_key=${meetingKey}&session_name=Race`,
  );
  if (!sessions.length) {
    throw new Error(`No Race session for meeting_key ${meetingKey}`);
  }
  return sessions[0];
}

async function main(): Promise<void> {
  const externalId = process.argv[2] ?? "2024-british-gp";
  const { year, circuitSlug } = parseExternalId(externalId);

  console.log(`\n=== F1 data spike: ${externalId} ===\n`);

  const jolpicaRace = await resolveJolpicaRace(year, circuitSlug);
  console.log("Jolpica race:");
  console.log(`  ${jolpicaRace.raceName} — round ${jolpicaRace.round}, ${jolpicaRace.date}`);
  console.log(`  Circuit: ${jolpicaRace.Circuit.circuitName} (${jolpicaRace.Circuit.circuitId})`);

  const meeting = await resolveOpenF1Meeting(year, circuitSlug);
  console.log("\nOpenF1 meeting:");
  console.log(`  ${meeting.meeting_name} — meeting_key ${meeting.meeting_key}`);
  console.log(`  ${meeting.date_start} → ${meeting.date_end}`);

  await new Promise((r) => setTimeout(r, 500));

  const session = await fetchRaceSession(meeting.meeting_key);
  console.log("\nOpenF1 race session:");
  console.log(`  session_key ${session.session_key}`);
  console.log(`  ${session.date_start} → ${session.date_end}`);

  const drivers = await fetchJson<OpenF1Driver[]>(
    `${OPENF1_BASE}/drivers?session_key=${session.session_key}`,
  );
  console.log(`\nField: ${drivers.length} drivers`);
  for (const d of drivers.slice(0, 5)) {
    console.log(`  #${d.driver_number} ${d.full_name} (${d.team_name})`);
  }
  if (drivers.length > 5) {
    console.log(`  ... and ${drivers.length - 5} more`);
  }

  await new Promise((r) => setTimeout(r, 500));

  const results = await fetchJson<OpenF1SessionResult[]>(
    `${OPENF1_BASE}/session_result?session_key=${session.session_key}`,
  );
  console.log(`\nResults: ${results.length} classified`);
  for (const r of results.slice(0, 5)) {
    console.log(`  P${r.position} #${r.driver_number} — ${r.points} pts`);
  }

  const p5 = results.find((r) => r.position === 5);
  if (p5) {
    console.log(`\nFastest-lap bonus check: P5 #${p5.driver_number} = ${p5.points} pts (expect 11 if FL bonus applied)`);
  }

  console.log("\nSuggested CompetitionEvent.metadata.f1:");
  console.log(
    JSON.stringify(
      {
        season: year,
        round: Number(jolpicaRace.round),
        meetingKey: meeting.meeting_key,
        sessionKey: session.session_key,
        circuitId: jolpicaRace.Circuit.circuitId,
        raceName: jolpicaRace.raceName,
        raceStart: session.date_start,
        raceEnd: session.date_end,
      },
      null,
      2,
    ),
  );

  console.log("\nSpike OK.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
