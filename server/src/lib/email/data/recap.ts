import { prisma } from "../../prisma.js";
import type { ResultsRow } from "../blocks/resultsTable.js";
import {
  formatTournamentSubtitle,
  loadTournamentForEmail,
} from "./tournament.js";
import type { TournamentRecapEmailData } from "../emails/tournamentRecap.js";

function parseContestResults(results: unknown): Array<{ name?: string; position?: number }> {
  if (!Array.isArray(results)) return [];
  return results.filter((r) => r && typeof r === "object") as Array<{
    name?: string;
    position?: number;
  }>;
}

async function loadTournamentHighlights(tournamentId: string): Promise<ResultsRow[]> {
  const contests = await prisma.contest.findMany({
    where: { tournamentId, status: { in: ["SETTLED", "CLOSED"] } },
    select: { name: true, results: true },
    take: 5,
  });

  const rows: ResultsRow[] = [];
  for (const c of contests) {
    const parsed = parseContestResults(c.results);
    const winner = parsed.find((r) => r.position === 1) ?? parsed[0];
    if (winner?.name) {
      rows.push({ label: c.name, value: `Winner: ${winner.name}` });
    }
  }

  if (rows.length === 0) {
    rows.push({ label: "Tournament", value: "Results are being finalized on Play The Cut." });
  }
  return rows;
}

async function loadPersonalRecapRows(
  userId: string,
  tournamentId: string,
): Promise<ResultsRow[]> {
  const lineups = await prisma.contestLineup.findMany({
    where: {
      userId,
      contest: { tournamentId },
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

  return lineups.map((l) => {
    const pos = l.position != null ? `#${l.position}` : "—";
    const score = l.score != null ? `${l.score} pts` : "pending";
    return { label: l.contest.name, value: `${pos} · ${score}` };
  });
}

export async function loadTournamentRecapBroadcastData(
  tournamentId: string,
): Promise<TournamentRecapEmailData | null> {
  const tournament = await loadTournamentForEmail(tournamentId);
  if (!tournament) return null;

  const highlights = await loadTournamentHighlights(tournamentId);

  return {
    tournamentName: tournament.name,
    subtitle: formatTournamentSubtitle(tournament),
    highlights,
    nextWeekTeaser: "Next week's tournament opens soon on Play The Cut.",
  };
}

export async function loadTournamentRecapEmailDataForUser(
  userId: string,
  tournamentId: string,
): Promise<TournamentRecapEmailData | null> {
  const base = await loadTournamentRecapBroadcastData(tournamentId);
  if (!base) return null;

  const personalResults = await loadPersonalRecapRows(userId, tournamentId);
  return { ...base, personalResults };
}
