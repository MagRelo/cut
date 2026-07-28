import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "../../prisma.js";
import { getSportEmailContent } from "../../../sports/emailContentRegistry.js";

const ET = "America/New_York";

type EventMetadata = {
  name?: string;
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

/** Platform date range: "Jul 23–Jul 26, 2026" (ET) */
export function formatEventDateRange(event: {
  startDate: Date;
  endDate: Date;
}): string {
  const start = formatInTimeZone(event.startDate, ET, "MMM d");
  const end = formatInTimeZone(event.endDate, ET, "MMM d, yyyy");
  return `${start}–${end}`;
}

/**
 * Single-line subtitle via sport email adapter when registered;
 * otherwise course/city/state + dates.
 */
export function formatEventSubtitle(event: {
  sportId?: string;
  course: string;
  city: string;
  state: string;
  startDate: Date;
  endDate: Date;
}): string {
  if (event.sportId) {
    const adapter = getSportEmailContent(event.sportId);
    if (adapter) {
      return adapter.formatEventSubtitle({
        course: event.course,
        city: event.city,
        state: event.state,
        startDate: event.startDate,
        endDate: event.endDate,
      });
    }
  }
  const place = [event.city, event.state].filter(Boolean).join(", ");
  const courseLine = [event.course, place].filter(Boolean).join(" · ");
  const dates = formatEventDateRange(event);
  return [courseLine, dates].filter(Boolean).join(" — ");
}

/** @deprecated Prefer sport email adapter courseLine via loadAnnouncementContent */
export function formatEventCourseLine(event: {
  sportId?: string;
  course: string;
  city: string;
  state: string;
}): string {
  if (event.sportId) {
    const adapter = getSportEmailContent(event.sportId);
    if (adapter) {
      return adapter.formatEventSubtitle({
        course: event.course,
        city: event.city,
        state: event.state,
        startDate: new Date(0),
        endDate: new Date(0),
      }).split(" — ")[0] ?? "";
    }
  }
  const place = [event.city, event.state].filter(Boolean).join(", ");
  return [event.course, place].filter(Boolean).join(" · ");
}

export function formatEventPlace(event: { city: string; state: string }): string {
  return [event.city, event.state].filter(Boolean).join(", ");
}

export function formatLockLabel(endTime: Date): string {
  return formatInTimeZone(endTime, ET, "EEEE, MMM d 'at' h:mm a zzz");
}

/** Requires explicit sportId — no PGA default. */
export async function getActiveEventId(sportId: string): Promise<string | null> {
  const event = await prisma.competitionEvent.findFirst({
    where: { isActive: true, sportId },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  return event?.id ?? null;
}

/** Any active event (multi-sport welcome / preview). */
export async function getAnyActiveEvent(): Promise<{
  id: string;
  sportId: string;
} | null> {
  const event = await prisma.competitionEvent.findFirst({
    where: { isActive: true },
    select: { id: true, sportId: true },
    orderBy: { createdAt: "desc" },
  });
  return event;
}

/** @deprecated Use getActiveEventId(sportId) or getAnyActiveEvent() */
export async function getManualActiveTournamentId(): Promise<string | null> {
  const event = await getAnyActiveEvent();
  return event?.id ?? null;
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
