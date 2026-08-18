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

function copyString(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  key: string,
): void {
  const value = source[key];
  if (typeof value === "string") target[key] = value;
}

function copyNumber(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  key: string,
): void {
  const value = source[key];
  if (typeof value === "number" && Number.isFinite(value)) target[key] = value;
}

function copyBoolean(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  key: string,
): void {
  const value = source[key];
  if (typeof value === "boolean") target[key] = value;
}

function slimF1Block(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const source = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  copyNumber(out, source, "season");
  copyNumber(out, source, "round");
  copyNumber(out, source, "meetingKey");
  copyNumber(out, source, "sessionKey");
  copyString(out, source, "circuitId");
  copyString(out, source, "raceName");
  copyString(out, source, "raceStart");
  copyString(out, source, "raceEnd");
  copyBoolean(out, source, "classificationComplete");
  return Object.keys(out).length > 0 ? out : undefined;
}

function slimCommoditiesBlock(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const source = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  copyString(out, source, "sessionDate");
  copyString(out, source, "sessionWeek");
  copyNumber(out, source, "weekNumber");
  copyString(out, source, "sessionOpen");
  copyString(out, source, "sessionClose");
  copyBoolean(out, source, "sessionStarted");
  copyBoolean(out, source, "sessionComplete");
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Header fields only — no summarySections, fieldSnapshot, weather, or venue blobs. */
export function directoryMetadata(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  copyString(out, source, "name");
  copyString(out, source, "startDate");
  copyString(out, source, "endDate");
  copyString(out, source, "status");
  copyString(out, source, "course");
  copyString(out, source, "city");
  copyString(out, source, "state");
  copyString(out, source, "timezone");
  copyString(out, source, "beautyImage");
  copyString(out, source, "periodDisplay");
  if (typeof source.periodStatusDisplay === "string" || source.periodStatusDisplay === null) {
    out.periodStatusDisplay = source.periodStatusDisplay;
  }
  copyNumber(out, source, "currentPeriod");
  const f1 = slimF1Block(source.f1);
  if (f1) out.f1 = f1;
  const commodities = slimCommoditiesBlock(source.commodities);
  if (commodities) out.commodities = commodities;
  return out;
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
  const metadata = directoryMetadata(event.metadata);
  return {
    ...eventSummaryForContest({ ...event, metadata }),
    isActive: event.isActive,
    metadata,
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
