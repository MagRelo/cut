import { prisma } from "../../lib/prisma.js";
import { formatContestResponse } from "../../utils/formatContestResponse.js";
import {
  contestListSelect,
  contestVisibilityWhere,
} from "../../utils/contestListQuery.js";
import {
  directoryEventFromRecord,
  eventStartDate,
  type ContestDirectoryEvent,
} from "../../utils/contestEventSummary.js";
import { eventStatusFromMetadata } from "../../utils/eventStatus.js";

export const RECENT_EVENTS_PER_SPORT = 3;

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

async function recentInactiveEventsForSport(
  sportId: string,
  limit = RECENT_EVENTS_PER_SPORT,
): Promise<EventWithSport[]> {
  const events = await prisma.competitionEvent.findMany({
    where: { sportId, isActive: false },
    select: {
      id: true,
      sportId: true,
      externalId: true,
      isActive: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
      sport: { select: { id: true, name: true } },
    },
  });

  return events
    .sort((a, b) => eventStartDate(b).getTime() - eventStartDate(a).getTime())
    .slice(0, limit);
}

function buildGroups(
  events: EventWithSport[],
  contestsByEventId: Map<string, ReturnType<typeof formatContestResponse>[]>,
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

  return groups.sort((a, b) => {
    const startA = a.event.startDate ? new Date(a.event.startDate).getTime() : 0;
    const startB = b.event.startDate ? new Date(b.event.startDate).getTime() : 0;
    return startB - startA;
  });
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

  const upcomingEvents: EventWithSport[] = [];
  const liveEvents: EventWithSport[] = [];
  const pastEvents: EventWithSport[] = [];

  if (scope === "live" || scope === "all") {
    const activeRows = await prisma.competitionEvent.findMany({
      where: {
        isActive: true,
        sportId: { in: sports.map((sport) => sport.id) },
      },
      select: {
        id: true,
        sportId: true,
        externalId: true,
        isActive: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        sport: { select: { id: true, name: true } },
      },
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
    for (const sport of sports) {
      const recent = await recentInactiveEventsForSport(sport.id);
      pastEvents.push(...recent);
    }
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
    upcoming: buildGroups(upcomingEvents, contestsByEventId),
    live: buildGroups(liveEvents, contestsByEventId),
    past: buildGroups(pastEvents, contestsByEventId),
  };
}
