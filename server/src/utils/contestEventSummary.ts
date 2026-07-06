export type ContestEventSummaryRecord = {
  id: string;
  sportId: string;
  sportName: string;
  externalId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
};

export type ContestDirectoryEvent = ContestEventSummaryRecord & {
  isActive: boolean;
  metadata: unknown;
};

function metadataOf(raw: unknown): { name?: string; startDate?: string; endDate?: string } {
  return typeof raw === "object" && raw !== null
    ? (raw as { name?: string; startDate?: string; endDate?: string })
    : {};
}

export function eventSummaryForContest(event: {
  id: string;
  sportId: string;
  externalId: string;
  metadata: unknown;
  sport: { id: string; name: string };
}): ContestEventSummaryRecord {
  const meta = metadataOf(event.metadata);
  return {
    id: event.id,
    sportId: event.sportId,
    sportName: event.sport.name,
    externalId: event.externalId,
    name: meta.name ?? event.externalId,
    startDate: meta.startDate ?? null,
    endDate: meta.endDate ?? null,
  };
}

export function directoryEventFromRecord(event: {
  id: string;
  sportId: string;
  externalId: string;
  isActive: boolean;
  metadata: unknown;
  sport: { id: string; name: string };
}): ContestDirectoryEvent {
  return {
    ...eventSummaryForContest(event),
    isActive: event.isActive,
    metadata: event.metadata,
  };
}

export function eventStartDate(event: { metadata: unknown; createdAt: Date }): Date {
  const startDate = metadataOf(event.metadata).startDate;
  if (!startDate) return event.createdAt;
  const parsed = new Date(startDate);
  return Number.isNaN(parsed.getTime()) ? event.createdAt : parsed;
}
