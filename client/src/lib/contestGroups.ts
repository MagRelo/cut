import type {
  Contest,
  ContestDirectoryEvent,
  ContestEventSummary,
  EventContestGroup,
  LeagueContest,
} from "../types/contest";

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
