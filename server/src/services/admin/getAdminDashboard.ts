import { SideBetTicketStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { sideBetsEnabled } from "../sideBets/featureFlag.js";
import {
  eventToDashboardTournament,
  isEventCompleteForSettlement,
  resolveAdminEvent,
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
  parlays: {
    marketsByStatus: {} as Record<string, number>,
    ticketsByStatus: {} as Record<string, number>,
    totals: { stakeInflow: 0, openStake: 0, openLiability: 0, ticketCount: 0 },
    byParlayType: [] as Array<{
      hitsRequired: number;
      topN: number;
      ticketCount: number;
      stakeTotal: number;
      openCount: number;
      openLiability: number;
    }>,
  },
  operations: {
    activeContests: 0,
    contestsNeedingLock: 0,
    openSideBetMarkets: 0,
    openSideBetTickets: 0,
    lockedSideBetMarkets: 0,
    sideBetsEnabled: sideBetsEnabled(),
    tournamentIsComplete: false,
    suggestedActions: ["Set an active competition event to view this week's data."],
  },
};

export type AdminDashboardResponse = Awaited<ReturnType<typeof getAdminDashboard>>;

export async function getAdminDashboard(eventIdOverride?: string) {
  const eventRow = await resolveAdminEvent(eventIdOverride);

  if (!eventRow) {
    return {
      generatedAt: new Date().toISOString(),
      tournament: null,
      weekCounts: {
        tournamentLineups: 0,
        contestLineups: 0,
      },
      ...emptyDashboard,
    };
  }

  const tournament = eventToDashboardTournament(eventRow);
  const eventId = eventRow.id;

  const [contests, sideBetMarkets, sideBetTickets, lineupCount, eventLineupCount] =
    await Promise.all([
      prisma.contest.findMany({
        where: { eventId },
        orderBy: [{ status: "asc" }, { name: "asc" }],
        select: {
          id: true,
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
      prisma.sideBetMarket.findMany({
        where: { eventId },
        select: { status: true },
      }),
      prisma.sideBetTicket.findMany({
        where: { sideBetMarket: { eventId } },
        select: {
          status: true,
          stakeAmount: true,
          decimalOddsAtPlacement: true,
          hitsRequired: true,
          topN: true,
        },
      }),
      prisma.contestLineup.count({
        where: { contest: { eventId } },
      }),
      prisma.lineup.count({
        where: { eventId },
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

  const marketsByStatus: Record<string, number> = {};
  for (const market of sideBetMarkets) {
    marketsByStatus[market.status] = (marketsByStatus[market.status] ?? 0) + 1;
  }

  const ticketsByStatus: Record<string, number> = {};
  let stakeInflow = 0;
  let openStake = 0;
  let openLiability = 0;
  const parlayMap = new Map<
    string,
    {
      hitsRequired: number;
      topN: number;
      ticketCount: number;
      stakeTotal: number;
      openCount: number;
      openLiability: number;
    }
  >();

  for (const ticket of sideBetTickets) {
    stakeInflow += ticket.stakeAmount;
    ticketsByStatus[ticket.status] = (ticketsByStatus[ticket.status] ?? 0) + 1;
    const key = `${ticket.hitsRequired}/${ticket.topN}`;
    const row = parlayMap.get(key) ?? {
      hitsRequired: ticket.hitsRequired,
      topN: ticket.topN,
      ticketCount: 0,
      stakeTotal: 0,
      openCount: 0,
      openLiability: 0,
    };
    row.ticketCount += 1;
    row.stakeTotal += ticket.stakeAmount;
    if (ticket.status === SideBetTicketStatus.OPEN) {
      openStake += ticket.stakeAmount;
      const liability = ticket.stakeAmount * ticket.decimalOddsAtPlacement;
      openLiability += liability;
      row.openCount += 1;
      row.openLiability += liability;
    }
    parlayMap.set(key, row);
  }

  const activeContests = contestsByStatus.ACTIVE ?? 0;
  const openSideBetMarkets = marketsByStatus.OPEN ?? 0;
  const lockedSideBetMarkets = marketsByStatus.LOCKED ?? 0;
  const openSideBetTickets = ticketsByStatus.OPEN ?? 0;
  const tournamentIsComplete = isEventCompleteForSettlement(eventRow.metadata);
  const enabled = sideBetsEnabled();

  const suggestedActions: string[] = [];
  if (activeContests > 0) {
    suggestedActions.push(
      `${activeContests} contest(s) ACTIVE — lock winner pool when secondary entries should close.`,
    );
  }
  if (enabled && openSideBetMarkets > 0 && tournamentIsComplete) {
    suggestedActions.push(
      `${openSideBetMarkets} side-bet market(s) still OPEN — lock before settling.`,
    );
  }
  if (enabled && lockedSideBetMarkets > 0 && tournamentIsComplete) {
    suggestedActions.push(
      `${lockedSideBetMarkets} locked market(s) ready to settle against final results.`,
    );
  }
  if (enabled && openSideBetTickets > 0) {
    suggestedActions.push(
      `${openSideBetTickets} open parlay ticket(s) — open liability ${openLiability.toFixed(2)}.`,
    );
  }
  if (suggestedActions.length === 0) {
    suggestedActions.push("No urgent batch actions detected for this week.");
  }

  return {
    generatedAt: new Date().toISOString(),
    tournament: {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      currentRound: tournament.currentRound,
      roundDisplay: tournament.roundDisplay,
      roundStatusDisplay: tournament.roundStatusDisplay,
      cutLine: tournament.cutLine,
      startDate: tournament.startDate.toISOString(),
      endDate: tournament.endDate.toISOString(),
    },
    weekCounts: {
      tournamentLineups: eventLineupCount,
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
    parlays: {
      marketsByStatus,
      ticketsByStatus,
      totals: {
        stakeInflow,
        openStake,
        openLiability,
        ticketCount: sideBetTickets.length,
      },
      byParlayType: [...parlayMap.values()].sort((a, b) =>
        a.hitsRequired !== b.hitsRequired
          ? a.hitsRequired - b.hitsRequired
          : a.topN - b.topN,
      ),
    },
    operations: {
      activeContests,
      contestsNeedingLock: activeContests,
      openSideBetMarkets,
      openSideBetTickets,
      lockedSideBetMarkets,
      sideBetsEnabled: enabled,
      tournamentIsComplete,
      suggestedActions,
    },
  };
}
