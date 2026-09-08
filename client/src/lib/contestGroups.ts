import type {
  Contest,
  ContestDirectoryEvent,
  ContestDirectoryResponse,
  ContestEventSummary,
  EventContestGroup,
  LeagueContest,
} from "../types/contest";
import { eventStatusFromMetadata } from "./eventMetadata";

export function sortContestsByEntryFee(contests: Contest[]): Contest[] {
  return [...contests].sort((a, b) => {
    const feeA = a.settings?.primaryDeposit ?? 0;
    const feeB = b.settings?.primaryDeposit ?? 0;
    return feeB - feeA;
  });
}

function directoryEventFromSummary(
  summary: ContestEventSummary,
  event?: Contest["event"],
): ContestDirectoryEvent {
  return {
    ...summary,
    isActive: event?.isActive ?? false,
    metadata: event?.metadata ?? {
      name: summary.name,
      startDate: summary.startDate ?? undefined,
      endDate: summary.endDate ?? undefined,
    },
  };
}

function directoryEventFromContest(contest: LeagueContest): ContestDirectoryEvent | null {
  if (contest.event?.sportId) {
    const meta =
      typeof contest.event.metadata === "object" && contest.event.metadata !== null
        ? (contest.event.metadata as { name?: string; startDate?: string; endDate?: string })
        : {};
    return {
      id: contest.event.id,
      sportId: contest.event.sportId,
      sportName: contest.eventSummary?.sportName ?? contest.event.sportId,
      externalId: contest.event.externalId,
      name: meta.name ?? contest.event.externalId,
      startDate: meta.startDate ?? null,
      endDate: meta.endDate ?? null,
      isActive: contest.event.isActive,
      metadata: contest.event.metadata,
    };
  }

  if (contest.eventSummary) {
    return directoryEventFromSummary(contest.eventSummary);
  }

  return null;
}

/** Groups a flat contest list (e.g. league contests) into event sections. */
export function groupContestsByEvent(contests: LeagueContest[]): EventContestGroup[] {
  const groups = new Map<string, EventContestGroup>();

  for (const contest of contests) {
    const event = directoryEventFromContest(contest);
    if (!event) continue;

    const existing = groups.get(event.id);
    if (existing) {
      existing.contests.push(contest);
    } else {
      groups.set(event.id, { event, contests: [contest] });
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      contests: sortContestsByEntryFee(group.contests),
    }))
    .sort((a, b) => {
      const startA = a.event.startDate ? new Date(a.event.startDate).getTime() : 0;
      const startB = b.event.startDate ? new Date(b.event.startDate).getTime() : 0;
      return startB - startA;
    });
}

export function flattenContestGroups(groups: EventContestGroup[]): LeagueContest[] {
  return groups.flatMap((group) =>
    group.contests.map((contest) => ({
      ...contest,
      eventSummary: {
        id: group.event.id,
        sportId: group.event.sportId,
        sportName: group.event.sportName,
        externalId: group.event.externalId,
        name: group.event.name,
        startDate: group.event.startDate,
        endDate: group.event.endDate,
      },
    })),
  );
}

function bucketDirectoryEvent(event: ContestDirectoryEvent): keyof ContestDirectoryResponse {
  const status = eventStatusFromMetadata(event.metadata);
  if (status === "LIVE") return "live";
  if (status === "COMPLETE") return "past";
  return "upcoming";
}

/**
 * League contest tab: directory event panels, with that league's contests overlaid.
 * Upcoming events stay visible when empty so admins can create a contest there.
 */
export function overlayLeagueContestsOnDirectory(
  directory: ContestDirectoryResponse | undefined,
  leagueContests: LeagueContest[],
): ContestDirectoryResponse {
  const leftoverByEventId = new Map(
    groupContestsByEvent(leagueContests).map((group) => [group.event.id, group]),
  );

  const overlaySection = (
    groups: EventContestGroup[],
    keepEmpty: boolean,
  ): EventContestGroup[] => {
    const result: EventContestGroup[] = [];
    for (const group of groups) {
      const league = leftoverByEventId.get(group.event.id);
      leftoverByEventId.delete(group.event.id);
      const contests = league?.contests ?? [];
      if (!keepEmpty && contests.length === 0) continue;
      result.push({ event: group.event, contests });
    }
    return result;
  };

  const upcoming = overlaySection(directory?.upcoming ?? [], true);
  const live = overlaySection(directory?.live ?? [], false);
  const past = overlaySection(directory?.past ?? [], false);

  for (const leftover of leftoverByEventId.values()) {
    const bucket = bucketDirectoryEvent(leftover.event);
    if (bucket === "live") live.push(leftover);
    else if (bucket === "past") past.push(leftover);
    else upcoming.push(leftover);
  }

  return { upcoming, live, past };
}

export function findDirectoryEvent(
  directory: ContestDirectoryResponse | undefined,
  eventId: string,
): ContestDirectoryEvent | null {
  if (!directory) return null;
  for (const section of ["upcoming", "live", "past"] as const) {
    const match = directory[section].find((group) => group.event.id === eventId);
    if (match) return match.event;
  }
  return null;
}

export function leagueCreateContestPath(leagueId: string, eventId: string): string {
  return `/leagues/${leagueId}/contests/create?eventId=${encodeURIComponent(eventId)}`;
}
