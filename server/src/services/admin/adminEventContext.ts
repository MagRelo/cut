import type { CompetitionEvent } from "@prisma/client";
import { isGolfEventCompleteRaw, isGolfEventLiveRaw } from "@cut/sport-pga-golf";
import { prisma } from "../../lib/prisma.js";

type GolfEventMetadata = {
  name?: string;
  status?: string;
  currentRound?: number | null;
  roundDisplay?: string | null;
  roundStatusDisplay?: string | null;
  cutLine?: string | null;
  startDate?: string;
  endDate?: string;
};

export function parseEventMetadata(metadata: unknown): GolfEventMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as GolfEventMetadata;
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
    currentRound: meta.currentRound ?? null,
    roundDisplay: meta.roundDisplay ?? null,
    roundStatusDisplay: meta.roundStatusDisplay ?? null,
    cutLine: meta.cutLine ?? null,
    startDate: start,
    endDate: end,
    sportId: event.sportId,
  };
}

export function resolveEventIdParam(eventId?: string | null): string {
  return eventId?.trim() ?? "";
}
