import { prisma } from "../../prisma.js";

export type EmailEventRecord = {
  id: string;
  sportId: string;
  externalId: string;
  name: string;
  metadata: unknown;
  emailAnnouncement: unknown;
};

function metadataRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export function mapEventForEmail(event: {
  id: string;
  sportId: string;
  externalId: string;
  metadata: unknown;
}): EmailEventRecord {
  const meta = metadataRecord(event.metadata);
  return {
    id: event.id,
    sportId: event.sportId,
    externalId: event.externalId,
    name: typeof meta.name === "string" && meta.name.trim() ? meta.name.trim() : event.externalId,
    metadata: event.metadata,
    emailAnnouncement: meta.emailAnnouncement ?? null,
  };
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

/**
 * Resolve event for email preview.
 * Prefer EVENT_ID or TOURNAMENT_ID; else active event for SPORT_ID (default pga-golf);
 * else any active event.
 */
export async function resolveEventIdForEmail(
  defaultSportId: string,
): Promise<string> {
  const fromEnv = process.env.EVENT_ID?.trim() || process.env.TOURNAMENT_ID?.trim();
  if (fromEnv) return fromEnv;
  const sportId = process.env.SPORT_ID?.trim() || defaultSportId;
  const id = await getActiveEventId(sportId);
  if (id) return id;
  const any = await getAnyActiveEvent();
  if (any) return any.id;
  throw new Error(
    "No active event; set EVENT_ID or run: pnpm run service:init-event pga-golf R{pgaTourId}",
  );
}

export async function loadEventForEmail(eventId: string): Promise<EmailEventRecord | null> {
  const event = await prisma.competitionEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      sportId: true,
      externalId: true,
      metadata: true,
    },
  });
  if (!event) return null;
  return mapEventForEmail(event);
}
