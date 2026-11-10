import { prisma } from "../../lib/prisma.js";
import { getTournament, formatWeather } from "../../lib/pgaTournament.js";
import { mergeEventPeriodFields } from "@cut/sport-sdk";
import { parseTournamentDates } from "./parseTournamentDates.js";
import { PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";
import type { GolfEventMetadata } from "@cut/sport-pga-golf";

const SEEDED_DISPLAY_FIELDS = [
  "name",
  "course",
  "city",
  "state",
  "timezone",
  "beautyImage",
] as const;

type SeededDisplayField = (typeof SEEDED_DISPLAY_FIELDS)[number];

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

function hasStoredText(existing: unknown, key: string): boolean {
  if (!existing || typeof existing !== "object" || Array.isArray(existing)) return false;
  const value = (existing as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0;
}

function seedDisplayField(
  patch: Partial<GolfEventMetadata>,
  existing: unknown,
  key: SeededDisplayField,
  incoming: string | null | undefined,
): void {
  if (hasStoredText(existing, key)) return;
  const trimmed = incoming?.trim();
  if (!trimmed) return;
  patch[key] = trimmed;
}

/** Key-order independent. Postgres jsonb does not preserve object key order. */
function sameMetadata(left: unknown, right: unknown): boolean {
  return stableSerialize(left) === stableSerialize(right);
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

export async function syncGolfEventMetadata(eventId: string) {
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
    pgaTourId: event.externalId,
    status: tournamentData.tournamentStatus,
    weather: formatWeather(tournamentData.weather),
  };

  if (parsedDates) {
    patch.startDate = parsedDates.startDate.toISOString();
    patch.endDate = parsedDates.endDate.toISOString();
  }

  seedDisplayField(patch, event.metadata, "name", tournamentData.tournamentName);
  seedDisplayField(patch, event.metadata, "course", tournamentData.courses?.[0]?.courseName);
  seedDisplayField(patch, event.metadata, "city", tournamentData.city);
  seedDisplayField(patch, event.metadata, "state", tournamentData.state);
  seedDisplayField(patch, event.metadata, "timezone", tournamentData.timezone);
  seedDisplayField(patch, event.metadata, "beautyImage", tournamentData.beautyImage);

  const metadata = mergeEventPeriodFields(mergeEventMetadata(event.metadata, patch), {
    currentPeriod: tournamentData.currentRound,
    periodDisplay: tournamentData.roundDisplay,
    periodStatusDisplay: tournamentData.roundStatusDisplay,
  });

  if (sameMetadata(event.metadata, metadata)) {
    return;
  }

  await prisma.competitionEvent.update({
    where: { id: event.id },
    data: { metadata: metadata as object },
  });
}
