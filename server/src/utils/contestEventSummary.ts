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

function metadataOf(raw: unknown): {
  name?: string;
  startDate?: string;
  endDate?: string;
  commodities?: { sessionOpen?: string; sessionClose?: string };
} {
  return typeof raw === "object" && raw !== null
    ? (raw as {
        name?: string;
        startDate?: string;
        endDate?: string;
        commodities?: { sessionOpen?: string; sessionClose?: string };
      })
    : {};
}

/** Platform startDate, or commodities sessionOpen when sport-specific dates are nested. */
export function resolveEventStartDateString(metadata: unknown): string | null {
  const meta = metadataOf(metadata);
  if (meta.startDate) return meta.startDate;
  if (meta.commodities?.sessionOpen) return meta.commodities.sessionOpen;
  return null;
}

/** Platform endDate, or commodities sessionClose when sport-specific dates are nested. */
export function resolveEventEndDateString(metadata: unknown): string | null {
  const meta = metadataOf(metadata);
  if (meta.endDate) return meta.endDate;
  if (meta.commodities?.sessionClose) return meta.commodities.sessionClose;
  return null;
}

function parseDateOrFallback(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
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
    startDate: resolveEventStartDateString(event.metadata),
    endDate: resolveEventEndDateString(event.metadata),
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
  return parseDateOrFallback(resolveEventStartDateString(event.metadata), event.createdAt);
}

export function eventEndDate(event: { metadata: unknown; createdAt: Date }): Date {
  const end = resolveEventEndDateString(event.metadata);
  if (end) return parseDateOrFallback(end, eventStartDate(event));
  return eventStartDate(event);
}
