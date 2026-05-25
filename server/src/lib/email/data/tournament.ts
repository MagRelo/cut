import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "../../prisma.js";
import { parseSummarySections } from "../../tournamentSummary.js";

const ET = "America/New_York";

export function formatTournamentSubtitle(tournament: {
  course: string;
  city: string;
  state: string;
  startDate: Date;
  endDate: Date;
}): string {
  const location = [tournament.course, tournament.city, tournament.state].filter(Boolean).join(" · ");
  const start = formatInTimeZone(tournament.startDate, ET, "MMM d");
  const end = formatInTimeZone(tournament.endDate, ET, "MMM d, yyyy");
  return `${location} — ${start}–${end}`;
}

export async function getManualActiveTournamentId(): Promise<string | null> {
  const t = await prisma.tournament.findFirst({
    where: { manualActive: true },
    select: { id: true },
  });
  return t?.id ?? null;
}

export async function loadTournamentForEmail(tournamentId: string) {
  return prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      name: true,
      pgaTourId: true,
      course: true,
      city: true,
      state: true,
      startDate: true,
      endDate: true,
      status: true,
      summarySections: true,
    },
  });
}

export function summarySectionsFromTournament(tournament: { summarySections: unknown }) {
  return parseSummarySections(tournament.summarySections);
}

export function formatLockLabel(endTime: Date): string {
  return formatInTimeZone(endTime, ET, "EEEE, MMM d 'at' h:mm a zzz");
}
