import { prisma } from "../../lib/prisma.js";
import { getTournament, formatWeather } from "../../lib/pgaTournament.js";
import { parseTournamentDates } from "./parseTournamentDates.js";
import { PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";
import type { GolfEventMetadata } from "@cut/sport-pga-golf";

function mergeEventMetadata(
  existing: unknown,
  patch: Partial<GolfEventMetadata>,
): GolfEventMetadata {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};

  return {
    name: typeof patch.name === "string" ? patch.name : (base.name as string) ?? "",
    pgaTourId:
      typeof patch.pgaTourId === "string"
        ? patch.pgaTourId
        : (base.pgaTourId as string) ?? "",
    status: typeof patch.status === "string" ? patch.status : (base.status as string) ?? "",
    ...base,
    ...patch,
  } as GolfEventMetadata;
}

export async function syncGolfEventMetadata(
  eventId: string,
  options?: { seedBeautyImage?: boolean },
) {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: PGA_GOLF_SPORT_ID },
  });

  if (!event) {
    throw new Error(`Golf event not found: ${eventId}`);
  }

  const tournamentData = await getTournament(event.externalId);
  const parsedDates = parseTournamentDates(
    tournamentData.displayDate,
    tournamentData.timezone,
    tournamentData.seasonYear,
  );

  const patch: Partial<GolfEventMetadata> = {
    name: tournamentData.tournamentName,
    pgaTourId: event.externalId,
    status: tournamentData.tournamentStatus,
    roundStatusDisplay: tournamentData.roundStatusDisplay,
    roundDisplay: tournamentData.roundDisplay,
    currentRound: tournamentData.currentRound,
    weather: formatWeather(tournamentData.weather),
    city: tournamentData.city,
    state: tournamentData.state,
    timezone: tournamentData.timezone,
  };

  const courseName = tournamentData.courses?.[0]?.courseName;
  if (courseName) {
    patch.course = courseName;
  }

  if (parsedDates) {
    patch.startDate = parsedDates.startDate.toISOString();
    patch.endDate = parsedDates.endDate.toISOString();
  }

  if (options?.seedBeautyImage) {
    patch.beautyImage = tournamentData.beautyImage?.trim() || null;
  }

  const metadata = mergeEventMetadata(event.metadata, patch);

  await prisma.competitionEvent.update({
    where: { id: event.id },
    data: { metadata: metadata as object },
  });
}
