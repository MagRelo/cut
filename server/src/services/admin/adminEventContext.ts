import type { CompetitionEvent } from "@prisma/client";
import { readCurrentPeriod, readPeriodDisplay, readPeriodStatusDisplay } from "@cut/sport-sdk";
import { isGolfEventCompleteRaw, isGolfEventLiveRaw } from "@cut/sport-pga-golf";
import { prisma } from "../../lib/prisma.js";

type GolfEventMetadata = {
  name?: string;
  status?: string;
  currentPeriod?: number | null;
  periodDisplay?: string | null;
  periodStatusDisplay?: string | null;
  cutLine?: string | null;
  startDate?: string;
  endDate?: string;
};

export function parseEventMetadata(metadata: unknown): GolfEventMetadata {
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

export function eventStatusForDashboard(metadata: unknown): string {
  const raw = parseEventMetadata(metadata).status ?? "";
  if (isGolfEventCompleteRaw(raw)) return "COMPLETED";
  if (isGolfEventLiveRaw(raw)) return "IN_PROGRESS";
  const status = raw.toUpperCase();
  if (status === "CANCELLED") return "CANCELLED";
  return "NOT_STARTED";
}

export function isEventCompleteForSettlement(metadata: unknown): boolean {
  const raw = parseEventMetadata(metadata).status ?? "";
  return isGolfEventCompleteRaw(raw);
}

export async function resolveAdminEvent(eventIdOverride?: string) {
  const id = eventIdOverride?.trim();
  if (id) {
    return prisma.competitionEvent.findUnique({
      where: { id },
      include: { sport: true },
    });
  }

  return prisma.competitionEvent.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: { sport: true },
  });
}

export function eventToDashboardEvent(event: CompetitionEvent) {
  const meta = parseEventMetadata(event.metadata);
  const start = meta.startDate ? new Date(meta.startDate) : event.createdAt;
  const end = meta.endDate ? new Date(meta.endDate) : event.createdAt;

  return {
    id: event.id,
    name: meta.name ?? event.externalId,
    status: eventStatusForDashboard(event.metadata),
    currentPeriod: meta.currentPeriod ?? null,
    periodDisplay: meta.periodDisplay ?? null,
    periodStatusDisplay: meta.periodStatusDisplay ?? null,
    cutLine: meta.cutLine ?? null,
    startDate: start,
    endDate: end,
    sportId: event.sportId,
  };
}

export function resolveEventIdParam(eventId?: string | null): string {
  return eventId?.trim() ?? "";
}
