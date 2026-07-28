import type { CompetitionEvent, Sport } from "@prisma/client";
import { readCurrentPeriod, readPeriodDisplay, readPeriodStatusDisplay } from "@cut/sport-sdk";
import { prisma } from "../../lib/prisma.js";
import { getActiveEvents } from "../events/getActiveEvents.js";
import { getPropBetModule } from "../../sports/propBetRegistry.js";
import { eventStatusFromMetadata } from "../../utils/eventStatus.js";

export type AdminEventRow = CompetitionEvent & { sport: Sport };

type EventMetadataView = {
  name?: string;
  status?: string;
  currentPeriod?: number | null;
  periodDisplay?: string | null;
  periodStatusDisplay?: string | null;
  cutLine?: string | null;
  startDate?: string;
  endDate?: string;
};

export function parseEventMetadata(metadata: unknown): EventMetadataView {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  const record = metadata as Record<string, unknown>;
  return {
    ...(typeof record.name === "string" ? { name: record.name } : {}),
    ...(typeof record.status === "string" ? { status: record.status } : {}),
    currentPeriod: readCurrentPeriod(metadata),
    periodDisplay: readPeriodDisplay(metadata),
    periodStatusDisplay: readPeriodStatusDisplay(metadata),
    ...(typeof record.cutLine === "string" ? { cutLine: record.cutLine } : {}),
    ...(typeof record.startDate === "string" ? { startDate: record.startDate } : {}),
    ...(typeof record.endDate === "string" ? { endDate: record.endDate } : {}),
  };
}

export function eventStatusForDashboard(metadata: unknown, sportId?: string): string {
  if (sportId) {
    const status = eventStatusFromMetadata(metadata, sportId);
    if (status === "COMPLETE") return "COMPLETED";
    if (status === "LIVE") return "IN_PROGRESS";
    if (status === "SCHEDULED") return "NOT_STARTED";
  }
  const raw = parseEventMetadata(metadata).status ?? "";
  const status = raw.toUpperCase();
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "COMPLETE" || status === "COMPLETED" || status === "OFFICIAL") return "COMPLETED";
  if (status === "LIVE" || status === "IN_PROGRESS" || status === "IN PROGRESS") return "IN_PROGRESS";
  return "NOT_STARTED";
}

export function isEventCompleteForSettlement(metadata: unknown, sportId?: string): boolean {
  if (sportId) {
    const prop = getPropBetModule(sportId);
    if (prop?.isEventCompleteForSettlement) {
      return prop.isEventCompleteForSettlement(metadata);
    }
    return eventStatusFromMetadata(metadata, sportId) === "COMPLETE";
  }
  return eventStatusFromMetadata(metadata) === "COMPLETE";
}

export async function resolveAdminEvents(eventIdOverride?: string): Promise<AdminEventRow[]> {
  const id = eventIdOverride?.trim();
  if (id) {
    const event = await prisma.competitionEvent.findUnique({
      where: { id },
      include: { sport: true },
    });
    return event ? [event] : [];
  }

  return getActiveEvents();
}

/** @deprecated Prefer `resolveAdminEvents` for multi-sport dashboards. */
export async function resolveAdminEvent(eventIdOverride?: string) {
  const events = await resolveAdminEvents(eventIdOverride);
  return events[0] ?? null;
}

export function eventToDashboardEvent(event: AdminEventRow | CompetitionEvent) {
  const meta = parseEventMetadata(event.metadata);
  const start = meta.startDate ? new Date(meta.startDate) : event.createdAt;
  const end = meta.endDate ? new Date(meta.endDate) : event.createdAt;
  const sport = "sport" in event ? event.sport : null;

  return {
    id: event.id,
    name: meta.name ?? event.externalId,
    status: eventStatusForDashboard(event.metadata, event.sportId),
    currentPeriod: meta.currentPeriod ?? null,
    periodDisplay: meta.periodDisplay ?? null,
    periodStatusDisplay: meta.periodStatusDisplay ?? null,
    cutLine: meta.cutLine ?? null,
    startDate: start,
    endDate: end,
    sportId: event.sportId,
    sportName: sport?.name ?? event.sportId,
  };
}

export function resolveEventIdParam(eventId?: string | null): string {
  return eventId?.trim() ?? "";
}
