import { prisma } from "../../prisma.js";
import type { ResultsRow } from "../blocks/resultsTable.js";
import { formatEventSubtitle, loadEventForEmail } from "./event.js";
import type { TournamentRecapEmailData } from "../emails/tournamentRecap.js";

function parseContestResults(results: unknown): Array<{ name?: string; position?: number }> {
  if (!Array.isArray(results)) return [];
  return results.filter((row) => row && typeof row === "object") as Array<{
    name?: string;
    position?: number;
  }>;
}

async function loadEventHighlights(eventId: string): Promise<ResultsRow[]> {
  const contests = await prisma.contest.findMany({
    where: { eventId, status: { in: ["SETTLED", "CLOSED"] } },
    select: { name: true, results: true },
    take: 5,
  });

  const rows: ResultsRow[] = [];
  for (const contest of contests) {
    const parsed = parseContestResults(contest.results);
    const winner = parsed.find((row) => row.position === 1) ?? parsed[0];
    if (winner?.name) {
      rows.push({ label: contest.name, value: `Winner: ${winner.name}` });
    }
  }

  if (rows.length === 0) {
    rows.push({ label: "Event", value: "Results are being finalized on Play The Cut." });
  }
  return rows;
}

async function loadPersonalRecapRows(userId: string, eventId: string): Promise<ResultsRow[]> {
  const lineups = await prisma.contestLineup.findMany({
    where: {
      userId,
      contest: { eventId },
    },
    select: {
      score: true,
      position: true,
      contest: { select: { name: true } },
    },
  });

  if (lineups.length === 0) {
    return [{ label: "Contests", value: "You did not enter a contest this week." }];
  }

  return lineups.map((lineup) => {
    const pos = lineup.position != null ? `#${lineup.position}` : "—";
    const score = lineup.score != null ? `${lineup.score} pts` : "pending";
    return { label: lineup.contest.name, value: `${pos} · ${score}` };
  });
}

export async function loadEventRecapBroadcastData(
  eventId: string,
): Promise<TournamentRecapEmailData | null> {
  const event = await loadEventForEmail(eventId);
  if (!event) return null;

  const highlights = await loadEventHighlights(eventId);

  return {
    tournamentName: event.name,
    subtitle: formatEventSubtitle(event),
    highlights,
    nextWeekTeaser: "Next week's event opens soon on Play The Cut.",
  };
}

/** @deprecated Use loadEventRecapBroadcastData */
export async function loadTournamentRecapBroadcastData(
  eventId: string,
): Promise<TournamentRecapEmailData | null> {
  return loadEventRecapBroadcastData(eventId);
}

export async function loadEventRecapEmailDataForUser(
  userId: string,
  eventId: string,
): Promise<TournamentRecapEmailData | null> {
  const base = await loadEventRecapBroadcastData(eventId);
  if (!base) return null;

  const personalResults = await loadPersonalRecapRows(userId, eventId);
  return { ...base, personalResults };
}

/** @deprecated Use loadEventRecapEmailDataForUser */
export async function loadTournamentRecapEmailDataForUser(
  userId: string,
  eventId: string,
): Promise<TournamentRecapEmailData | null> {
  return loadEventRecapEmailDataForUser(userId, eventId);
}
