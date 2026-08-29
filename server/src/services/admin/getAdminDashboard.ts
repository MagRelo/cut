import { prisma } from "../../lib/prisma.js";
import {
  eventToDashboardEvent,
  isEventCompleteForSettlement,
  resolveAdminEvents,
} from "./adminEventContext.js";

function parsePrimaryDeposit(settings: unknown): number {
  if (typeof settings !== "object" || settings === null) return 0;
  const raw = (settings as { primaryDeposit?: unknown }).primaryDeposit;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

const emptyDashboard = {
  contests: {
    summary: {
      total: 0,
      byStatus: {} as Record<string, number>,
      totalLineups: 0,
      totalPrimaryCash: 0,
      totalSecondaryParticipants: 0,
    },
    items: [] as Array<{
      id: string;
      name: string;
      status: string;
      chainId: number;
      primaryDeposit: number;
      lineupCount: number;
      secondaryParticipantCount: number;
      estimatedPrimaryCash: number;
      userGroupName: string | null;
      endTime: string;
    }>,
  },
  operations: {
    activeContests: 0,
    contestsNeedingLock: 0,
    eventIsComplete: false,
    suggestedActions: ["Set an active competition event to view this week's data."],
  },
};

export type AdminDashboardResponse = Awaited<ReturnType<typeof getAdminDashboard>>;

export async function getAdminDashboard(eventIdOverride?: string) {
  const eventRows = await resolveAdminEvents(eventIdOverride);

  if (eventRows.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      event: null,
      events: [],
      weekCounts: {
        lineups: 0,
        contestLineups: 0,
      },
      ...emptyDashboard,
    };
  }

  const eventSummaries = eventRows.map(eventToDashboardEvent);
  const eventIds = eventRows.map((event) => event.id);
  const eventNameById = new Map(eventSummaries.map((event) => [event.id, event.name]));
  const sportNameById = new Map(eventSummaries.map((event) => [event.id, event.sportName]));

  const [contests, lineupCount, eventLineupCount] = await Promise.all([
    prisma.contest.findMany({
      where: { eventId: { in: eventIds } },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: {
        id: true,
        eventId: true,
        name: true,
        status: true,
        chainId: true,
        settings: true,
        endTime: true,
        userGroup: { select: { name: true } },
        _count: {
          select: {
            contestLineups: true,
            secondaryParticipants: true,
          },
        },
      },
    }),
    prisma.contestLineup.count({
      where: { contest: { eventId: { in: eventIds } } },
    }),
    prisma.lineup.count({
      where: { eventId: { in: eventIds } },
    }),
  ]);

  const contestsByStatus: Record<string, number> = {};
  let totalPrimaryCash = 0;
  let totalSecondaryParticipants = 0;
  const contestItems = contests.map((contest) => {
    const primaryDeposit = parsePrimaryDeposit(contest.settings);
    const contestLineupCount = contest._count.contestLineups;
    const secondaryParticipantCount = contest._count.secondaryParticipants;
    const estimatedPrimaryCash = primaryDeposit * contestLineupCount;
    contestsByStatus[contest.status] = (contestsByStatus[contest.status] ?? 0) + 1;
    totalPrimaryCash += estimatedPrimaryCash;
    totalSecondaryParticipants += secondaryParticipantCount;
    return {
      id: contest.id,
      eventId: contest.eventId,
      eventName: eventNameById.get(contest.eventId) ?? contest.eventId,
      sportName: sportNameById.get(contest.eventId) ?? null,
      name: contest.name,
      status: contest.status,
      chainId: contest.chainId,
      primaryDeposit,
      lineupCount: contestLineupCount,
      secondaryParticipantCount,
      estimatedPrimaryCash,
      userGroupName: contest.userGroup?.name ?? null,
      endTime: contest.endTime.toISOString(),
    };
  });

  const activeContests = contestsByStatus.ACTIVE ?? 0;
  const eventIsComplete = eventRows.every((event) =>
    isEventCompleteForSettlement(event.metadata, event.sportId),
  );

  const suggestedActions: string[] = [];
  if (activeContests > 0) {
    suggestedActions.push(
      `${activeContests} contest(s) ACTIVE — lock winner pool when secondary entries should close.`,
    );
  }
  if (suggestedActions.length === 0) {
    suggestedActions.push("No urgent batch actions detected for this week.");
  }

  const [soleEventSummary] = eventSummaries.length === 1 ? eventSummaries : [];

  return {
    generatedAt: new Date().toISOString(),
    event: soleEventSummary
      ? {
          id: soleEventSummary.id,
          name: soleEventSummary.name,
          status: soleEventSummary.status,
          currentPeriod: soleEventSummary.currentPeriod,
          periodDisplay: soleEventSummary.periodDisplay,
          periodStatusDisplay: soleEventSummary.periodStatusDisplay,
          cutLine: soleEventSummary.cutLine,
          startDate: soleEventSummary.startDate.toISOString(),
          endDate: soleEventSummary.endDate.toISOString(),
          sportId: soleEventSummary.sportId,
        }
      : null,
    events: eventSummaries.map((event) => ({
      id: event.id,
      name: event.name,
      status: event.status,
      currentPeriod: event.currentPeriod,
      periodDisplay: event.periodDisplay,
      periodStatusDisplay: event.periodStatusDisplay,
      cutLine: event.cutLine,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
      sportId: event.sportId,
      sportName: event.sportName,
    })),
    weekCounts: {
      lineups: eventLineupCount,
      contestLineups: lineupCount,
    },
    contests: {
      summary: {
        total: contests.length,
        byStatus: contestsByStatus,
        totalLineups: lineupCount,
        totalPrimaryCash,
        totalSecondaryParticipants,
      },
      items: contestItems,
    },
    operations: {
      activeContests,
      contestsNeedingLock: activeContests,
      eventIsComplete,
      suggestedActions,
    },
  };
}
