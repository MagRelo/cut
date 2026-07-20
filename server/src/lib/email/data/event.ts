import { formatInTimeZone } from "date-fns-tz";
import {
  formatEventCourseLine as formatCourseLineShared,
  formatEventPlace as formatPlaceShared,
  PGA_GOLF_SPORT_ID,
} from "@cut/sport-pga-golf";
import { prisma } from "../../prisma.js";
import { parseSummarySections } from "../../tournamentSummary.js";

const ET = "America/New_York";

type EventMetadata = {
  name?: string;
  pgaTourId?: string;
  course?: string;
  city?: string;
  state?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  summarySections?: unknown;
};

export type EmailEventRecord = {
  id: string;
  sportId: string;
  externalId: string;
  name: string;
  course: string;
  city: string;
  state: string;
  startDate: Date;
  endDate: Date;
  status: string;
  summarySections: unknown;
};

function metadataOf(raw: unknown): EventMetadata {
  return typeof raw === "object" && raw !== null ? (raw as EventMetadata) : {};
}

function parseMetadataDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function eventStartDate(event: {
  metadata: unknown;
  createdAt: Date;
}): Date {
  const meta = metadataOf(event.metadata);
  return parseMetadataDate(meta.startDate, event.createdAt);
}

export function mapEventForEmail(event: {
  id: string;
  sportId: string;
  externalId: string;
  metadata: unknown;
  createdAt: Date;
}): EmailEventRecord {
  const meta = metadataOf(event.metadata);
  return {
    id: event.id,
    sportId: event.sportId,
    externalId: event.externalId,
    name: meta.name ?? event.externalId,
    course: meta.course ?? "",
    city: meta.city ?? "",
    state: meta.state ?? "",
    startDate: parseMetadataDate(meta.startDate, event.createdAt),
    endDate: parseMetadataDate(meta.endDate, event.createdAt),
    status: meta.status ?? "SCHEDULED",
    summarySections: meta.summarySections ?? null,
  };
}

/** "Blaine, Minnesota" — city and state only (matches in-app event header). */
export function formatEventPlace(event: { city: string; state: string }): string {
  return formatPlaceShared(event.city, event.state);
}

/** "TPC Twin Cities · Blaine, Minnesota" */
export function formatEventCourseLine(event: {
  course: string;
  city: string;
  state: string;
}): string {
  return formatCourseLineShared(event.course, event.city, event.state);
}

/** "Jul 23–Jul 26, 2026" (ET) */
export function formatEventDateRange(event: {
  startDate: Date;
  endDate: Date;
}): string {
  const start = formatInTimeZone(event.startDate, ET, "MMM d");
  const end = formatInTimeZone(event.endDate, ET, "MMM d, yyyy");
  return `${start}–${end}`;
}

/** Single-line subtitle for emails that still use one meta row. */
export function formatEventSubtitle(event: {
  course: string;
  city: string;
  state: string;
  startDate: Date;
  endDate: Date;
}): string {
  const courseLine = formatEventCourseLine(event);
  const dates = formatEventDateRange(event);
  return [courseLine, dates].filter(Boolean).join(" — ");
}

export function formatLockLabel(endTime: Date): string {
  return formatInTimeZone(endTime, ET, "EEEE, MMM d 'at' h:mm a zzz");
}

export async function getActiveEventId(
  sportId: string = PGA_GOLF_SPORT_ID,
): Promise<string | null> {
  const event = await prisma.competitionEvent.findFirst({
    where: { isActive: true, sportId },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  return event?.id ?? null;
}

/** @deprecated Use getActiveEventId */
export async function getManualActiveTournamentId(): Promise<string | null> {
  return getActiveEventId();
}

export async function loadEventForEmail(eventId: string): Promise<EmailEventRecord | null> {
  const event = await prisma.competitionEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      sportId: true,
      externalId: true,
      metadata: true,
      createdAt: true,
    },
  });
  if (!event) return null;
  return mapEventForEmail(event);
}

/** @deprecated Use loadEventForEmail */
export async function loadTournamentForEmail(
  eventId: string,
): Promise<EmailEventRecord | null> {
  return loadEventForEmail(eventId);
}

export function summarySectionsFromEvent(event: { summarySections: unknown }) {
  return parseSummarySections(event.summarySections);
}

/** @deprecated Use summarySectionsFromEvent */
export function summarySectionsFromTournament(event: { summarySections: unknown }) {
  return summarySectionsFromEvent(event);
}

export async function previousEventIdsForSport(
  sportId: string,
  currentEventId: string,
  count = 3,
): Promise<string[]> {
  const events = await prisma.competitionEvent.findMany({
    where: { sportId },
    select: { id: true, metadata: true, createdAt: true },
  });

  const current = events.find((event) => event.id === currentEventId);
  if (!current) return [];

  const currentStart = eventStartDate(current);
  return events
    .filter((event) => event.id !== currentEventId)
    .filter((event) => eventStartDate(event) < currentStart)
    .sort((a, b) => eventStartDate(b).getTime() - eventStartDate(a).getTime())
    .slice(0, count)
    .map((event) => event.id);
}
