import { prisma } from "../../lib/prisma.js";
import { formatContestResponse } from "../../utils/formatContestResponse.js";
import {
  contestListSelect,
  contestVisibilityWhere,
} from "../../utils/contestListQuery.js";
import {
  directoryEventFromRecord,
  eventEndDate,
  eventStartDate,
  type ContestDirectoryEvent,
} from "../../utils/contestEventSummary.js";
import { eventStatusFromMetadata } from "../../utils/eventStatus.js";

/** Max past events shown across all sports (single timeline, not per-sport). */
export const RECENT_PAST_EVENTS = 9;

export type ContestDirectoryScope = "live" | "past" | "all";

export type EventContestGroup = {
  event: ContestDirectoryEvent;
  contests: ReturnType<typeof formatContestResponse>[];
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

const eventSelect = {
  id: true,
  sportId: true,
  externalId: true,
  isActive: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  sport: { select: { id: true, name: true } },
} as const;

type GroupSortKey = "start" | "end";

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

function dedupeEvents(events: EventWithSport[]): EventWithSport[] {
  const seen = new Set<string>();
  const out: EventWithSport[] = [];
  for (const event of events) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    out.push(event);
  }
  return out;
}

async function recentPastEvents(
  sportIds: string[],
  limit = RECENT_PAST_EVENTS,
): Promise<EventWithSport[]> {
  const events = await prisma.competitionEvent.findMany({
    where: { sportId: { in: sportIds }, isActive: false },
    select: eventSelect,
  });

  return sortEventsByEndDateDesc(events).slice(0, limit);
}

function buildGroups(
  events: EventWithSport[],
  contestsByEventId: Map<string, ReturnType<typeof formatContestResponse>[]>,
  sortKey: GroupSortKey = "start",
): EventContestGroup[] {
  const groups: EventContestGroup[] = [];

  for (const event of events) {
    const contests = contestsByEventId.get(event.id) ?? [];
    if (contests.length === 0) continue;
    const sortedContests = [...contests].sort((a, b) => {
      const rowA = a as { settings?: { primaryDeposit?: number } | null };
      const rowB = b as { settings?: { primaryDeposit?: number } | null };
      return (rowB.settings?.primaryDeposit ?? 0) - (rowA.settings?.primaryDeposit ?? 0);
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
  userId: string | null,
  scope: ContestDirectoryScope = "all",
  chainId?: number,
): Promise<ContestDirectoryResponse> {
  const sports = await prisma.sport.findMany({
    where: { isEnabled: true },
    select: { id: true },
    orderBy: { name: "asc" },
  });
  const sportIds = sports.map((sport) => sport.id);

  const upcomingEvents: EventWithSport[] = [];
  const liveEvents: EventWithSport[] = [];
  let pastEvents: EventWithSport[] = [];

  if (scope === "live" || scope === "all") {
    const activeRows = await prisma.competitionEvent.findMany({
      where: {
        isActive: true,
        sportId: { in: sportIds },
      },
      select: eventSelect,
    });

    for (const event of activeRows) {
      const status = eventStatusFromMetadata(event.metadata);
      if (status === "LIVE") {
        liveEvents.push(event);
      } else if (status === "COMPLETE") {
        pastEvents.push(event);
      } else {
        upcomingEvents.push(event);
      }
    }
  }

  if (scope === "past" || scope === "all") {
    const recent = await recentPastEvents(sportIds);
    pastEvents = sortEventsByEndDateDesc(dedupeEvents([...pastEvents, ...recent])).slice(
      0,
      RECENT_PAST_EVENTS,
    );
  } else {
    pastEvents = sortEventsByEndDateDesc(dedupeEvents(pastEvents)).slice(0, RECENT_PAST_EVENTS);
  }

  const eventIds = [...upcomingEvents, ...liveEvents, ...pastEvents].map((event) => event.id);
  if (eventIds.length === 0) {
    return { upcoming: [], live: [], past: [] };
  }

  const visibility = await contestVisibilityWhere(userId, chainId !== undefined ? { chainId } : {});
  const contests = await prisma.contest.findMany({
    where: {
      eventId: { in: eventIds },
      ...visibility,
    },
    select: contestListSelect,
  });

  const contestsByEventId = new Map<string, ReturnType<typeof formatContestResponse>[]>();
  for (const contest of contests) {
    const formatted = formatContestResponse(contest, undefined, contest.eventId);
    const existing = contestsByEventId.get(contest.eventId) ?? [];
    existing.push(formatted);
    contestsByEventId.set(contest.eventId, existing);
  }

  return {
    upcoming: buildGroups(sortEventsByStartDateDesc(upcomingEvents), contestsByEventId),
    live: buildGroups(sortEventsByStartDateDesc(liveEvents), contestsByEventId),
    past: buildGroups(pastEvents, contestsByEventId, "end"),
  };
}
