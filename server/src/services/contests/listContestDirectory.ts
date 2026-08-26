import { formatUnits } from "viem";
import { prisma } from "../../lib/prisma.js";
import { createTtlCache } from "../../lib/ttlCache.js";
import {
  contestDirectorySelect,
  contestPrivyVisibilityOr,
} from "../../utils/contestListQuery.js";
import {
  directoryEventFromRecord,
  eventEndDate,
  eventStartDate,
  type ContestDirectoryEvent,
} from "../../utils/contestEventSummary.js";
import { eventStatusFromMetadata } from "../../utils/eventStatus.js";

/** Max past events shown across all sports (single timeline, not per-sport). */
export const RECENT_PAST_EVENTS = 20;

/** Inactive events older than this are omitted from the directory query window. */
export const PAST_EVENT_LOOKBACK_DAYS = 120;

export const DIRECTORY_CACHE_TTL_MS = 30_000;

export type ContestDirectoryScope = "live" | "past" | "all";

type DirectoryContest = {
  id: string;
  name: string;
  eventId: string;
  userGroupId: string | null;
  endTime: Date;
  address: string | null;
  chainId: number;
  status: string;
  settings: Record<string, unknown> | null;
  userGroup: { id: string; name: string } | null;
  _count: { contestLineups: number };
  settledPot: number | null;
};

export type EventContestGroup = {
  event: ContestDirectoryEvent;
  contests: DirectoryContest[];
};

export type ContestDirectoryResponse = {
  upcoming: EventContestGroup[];
  live: EventContestGroup[];
  past: EventContestGroup[];
};

type EventWithSport = {
  id: string;
  sportId: string;
  externalId: string;
  isActive: boolean;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  sport: { id: string; name: string };
};

type GroupSortKey = "start" | "end";

const directoryCache = createTtlCache<ContestDirectoryResponse>(DIRECTORY_CACHE_TTL_MS);

export function contestDirectoryCacheKey(
  privyUserId: string | null,
  scope: ContestDirectoryScope,
): string {
  return `${scope}:${privyUserId ?? "anon"}`;
}

export function invalidateContestDirectory(): void {
  directoryCache.invalidateAll();
}

export async function getContestDirectory(
  privyUserId: string | null,
  scope: ContestDirectoryScope = "all",
): Promise<ContestDirectoryResponse> {
  return directoryCache.getOrLoad(contestDirectoryCacheKey(privyUserId, scope), () =>
    listContestDirectory(privyUserId, scope),
  );
}

function groupEventSortTime(event: ContestDirectoryEvent, sortKey: GroupSortKey): number {
  const primary = sortKey === "end" ? event.endDate : event.startDate;
  if (primary) return new Date(primary).getTime();
  if (event.startDate) return new Date(event.startDate).getTime();
  return 0;
}

function sortEventsByEndDateDesc(events: EventWithSport[]): EventWithSport[] {
  return [...events].sort((a, b) => eventEndDate(b).getTime() - eventEndDate(a).getTime());
}

function sortEventsByStartDateDesc(events: EventWithSport[]): EventWithSport[] {
  return [...events].sort((a, b) => eventStartDate(b).getTime() - eventStartDate(a).getTime());
}

function slimDirectorySettings(settings: unknown): Record<string, unknown> | null {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return null;
  const source = settings as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of [
    "contestType",
    "chainId",
    "maxEntry",
    "expiryTimestamp",
    "paymentTokenAddress",
    "paymentTokenSymbol",
    "operator",
    "primaryDeposit",
    "referralNetworkBps",
    "oracleFeeBps",
    "referralGroupId",
    "primaryDepositSecondarySubsidyBps",
  ]) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

function settledPotFromResults(results: unknown, decimals = 6): number | null {
  if (!results || typeof results !== "object" || Array.isArray(results)) return null;
  const snapshot = (
    results as { snapshot?: { primarySideBalance?: unknown; secondarySideBalance?: unknown } }
  ).snapshot;
  if (!snapshot) return null;
  try {
    const primary = BigInt(String(snapshot.primarySideBalance ?? "0"));
    const secondary = BigInt(String(snapshot.secondarySideBalance ?? "0"));
    return Math.round(Number(formatUnits(primary + secondary, decimals)));
  } catch {
    return null;
  }
}

function formatDirectoryContest(row: {
  id: string;
  name: string;
  eventId: string;
  userGroupId: string | null;
  endTime: Date;
  address: string | null;
  chainId: number;
  status: string;
  settings: unknown;
  results: unknown;
  userGroup: { id: string; name: string } | null;
  _count: { contestLineups: number };
}): DirectoryContest {
  return {
    id: row.id,
    name: row.name,
    eventId: row.eventId,
    userGroupId: row.userGroupId,
    endTime: row.endTime,
    address: row.address,
    chainId: row.chainId,
    status: row.status,
    settings: slimDirectorySettings(row.settings),
    userGroup: row.userGroup,
    _count: row._count,
    settledPot: settledPotFromResults(row.results),
  };
}

function buildGroups(
  events: EventWithSport[],
  contestsByEventId: Map<string, DirectoryContest[]>,
  sortKey: GroupSortKey = "start",
): EventContestGroup[] {
  const groups: EventContestGroup[] = [];

  for (const event of events) {
    const contests = contestsByEventId.get(event.id) ?? [];
    if (contests.length === 0) continue;
    const sortedContests = [...contests].sort((a, b) => {
      return (Number(b.settings?.primaryDeposit) || 0) - (Number(a.settings?.primaryDeposit) || 0);
    });
    groups.push({
      event: directoryEventFromRecord(event),
      contests: sortedContests,
    });
  }

  return groups.sort(
    (a, b) => groupEventSortTime(b.event, sortKey) - groupEventSortTime(a.event, sortKey),
  );
}

export async function listContestDirectory(
  privyUserId: string | null,
  scope: ContestDirectoryScope = "all",
): Promise<ContestDirectoryResponse> {
  const lookbackDate = new Date();
  lookbackDate.setUTCDate(lookbackDate.getUTCDate() - PAST_EVENT_LOOKBACK_DAYS);

  const eventWindow =
    scope === "live"
      ? { isActive: true as const }
      : {
          OR: [{ isActive: true }, { isActive: false, updatedAt: { gte: lookbackDate } }],
        };

  const rows = await prisma.contest.findMany({
    where: {
      OR: contestPrivyVisibilityOr(privyUserId),
      event: {
        sport: { isEnabled: true },
        ...eventWindow,
      },
    },
    select: contestDirectorySelect,
  });

  const upcomingEvents: EventWithSport[] = [];
  const liveEvents: EventWithSport[] = [];
  const pastEvents: EventWithSport[] = [];
  const seenEvents = new Set<string>();
  const contestsByEventId = new Map<string, DirectoryContest[]>();

  for (const row of rows) {
    const formatted = formatDirectoryContest(row);
    const existing = contestsByEventId.get(row.eventId) ?? [];
    existing.push(formatted);
    contestsByEventId.set(row.eventId, existing);

    if (seenEvents.has(row.event.id)) continue;
    seenEvents.add(row.event.id);

    const status = eventStatusFromMetadata(row.event.metadata, row.event.sportId);
    if (status === "LIVE") {
      liveEvents.push(row.event);
    } else if (status === "COMPLETE") {
      pastEvents.push(row.event);
    } else {
      upcomingEvents.push(row.event);
    }
  }

  const pastCapped = sortEventsByEndDateDesc(pastEvents).slice(0, RECENT_PAST_EVENTS);

  const empty: ContestDirectoryResponse = { upcoming: [], live: [], past: [] };
  if (scope === "past") {
    return { ...empty, past: buildGroups(pastCapped, contestsByEventId, "end") };
  }
  if (scope === "live") {
    return {
      upcoming: buildGroups(sortEventsByStartDateDesc(upcomingEvents), contestsByEventId),
      live: buildGroups(sortEventsByStartDateDesc(liveEvents), contestsByEventId),
      past: [],
    };
  }

  return {
    upcoming: buildGroups(sortEventsByStartDateDesc(upcomingEvents), contestsByEventId),
    live: buildGroups(sortEventsByStartDateDesc(liveEvents), contestsByEventId),
    past: buildGroups(pastCapped, contestsByEventId, "end"),
  };
}
