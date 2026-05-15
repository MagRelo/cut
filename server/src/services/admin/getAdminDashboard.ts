import { SideBetTicketStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { sideBetsEnabled } from "../sideBets/featureFlag.js";

function parsePrimaryDeposit(settings: unknown): number {
  if (typeof settings !== "object" || settings === null) return 0;
  const raw = (settings as { primaryDeposit?: unknown }).primaryDeposit;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export type AdminDashboardResponse = Awaited<ReturnType<typeof getAdminDashboard>>;

export async function getAdminDashboard(tournamentIdOverride?: string) {
  let tournamentId = tournamentIdOverride?.trim() ?? "";
  let tournament: {
    id: string;
    name: string;
    status: string;
    currentRound: number | null;
    roundDisplay: string | null;
    roundStatusDisplay: string | null;
    cutLine: string | null;
    startDate: Date;
    endDate: Date;
  } | null = null;

  if (!tournamentId) {
    const active = await prisma.tournament.findFirst({
      where: { manualActive: true },
      select: {
        id: true,
        name: true,
        status: true,
        currentRound: true,
        roundDisplay: true,
        roundStatusDisplay: true,
        cutLine: true,
        startDate: true,
        endDate: true,
      },
    });
    tournament = active;
    tournamentId = active?.id ?? "";
  } else {
    tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        status: true,
        currentRound: true,
        roundDisplay: true,
        roundStatusDisplay: true,
        cutLine: true,
        startDate: true,
        endDate: true,
      },
    });
  }

  if (!tournament) {
    return {
      generatedAt: new Date().toISOString(),
      tournament: null,
      contests: {
        summary: {
          total: 0,
          byStatus: {} as Record<string, number>,
          totalLineups: 0,
          totalPrimaryCash: 0,
          totalSecondaryParticipants: 0,
        },
        items: [],
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
        suggestedActions: ["Set a tournament to manualActive to view this week's data."],
      },
    };
  }

  const [contests, sideBetMarkets, sideBetTickets, lineupCount, tournamentLineupCount] =
    await Promise.all([
      prisma.contest.findMany({
        where: { tournamentId: tournament.id },
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
        where: { tournamentId: tournament.id },
        select: { status: true },
      }),
      prisma.sideBetTicket.findMany({
        where: { sideBetMarket: { tournamentId: tournament.id } },
        select: {
          status: true,
          stakeAmount: true,
          decimalOddsAtPlacement: true,
          hitsRequired: true,
          topN: true,
        },
      }),
      prisma.contestLineup.count({
        where: { contest: { tournamentId: tournament.id } },
      }),
      prisma.tournamentLineup.count({
        where: { tournamentId: tournament.id },
      }),
    ]);

  const contestsByStatus: Record<string, number> = {};
  let totalPrimaryCash = 0;
  let totalSecondaryParticipants = 0;
  const contestItems = contests.map((c) => {
    const primaryDeposit = parsePrimaryDeposit(c.settings);
    const lineupCount = c._count.contestLineups;
    const secondaryParticipantCount = c._count.secondaryParticipants;
    const estimatedPrimaryCash = primaryDeposit * lineupCount;
    contestsByStatus[c.status] = (contestsByStatus[c.status] ?? 0) + 1;
    totalPrimaryCash += estimatedPrimaryCash;
    totalSecondaryParticipants += secondaryParticipantCount;
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      chainId: c.chainId,
      primaryDeposit,
      lineupCount,
      secondaryParticipantCount,
      estimatedPrimaryCash,
      userGroupName: c.userGroup?.name ?? null,
      endTime: c.endTime.toISOString(),
    };
  });

  const marketsByStatus: Record<string, number> = {};
  for (const m of sideBetMarkets) {
    marketsByStatus[m.status] = (marketsByStatus[m.status] ?? 0) + 1;
  }

  const ticketsByStatus: Record<string, number> = {};
  let stakeInflow = 0;
  let openStake = 0;
  let openLiability = 0;
  const parlayMap = new Map<
    string,
    { hitsRequired: number; topN: number; ticketCount: number; stakeTotal: number; openCount: number; openLiability: number }
  >();

  for (const t of sideBetTickets) {
    stakeInflow += t.stakeAmount;
    ticketsByStatus[t.status] = (ticketsByStatus[t.status] ?? 0) + 1;
    const key = `${t.hitsRequired}/${t.topN}`;
    const row = parlayMap.get(key) ?? {
      hitsRequired: t.hitsRequired,
      topN: t.topN,
      ticketCount: 0,
      stakeTotal: 0,
      openCount: 0,
      openLiability: 0,
    };
    row.ticketCount += 1;
    row.stakeTotal += t.stakeAmount;
    if (t.status === SideBetTicketStatus.OPEN) {
      openStake += t.stakeAmount;
      const liability = t.stakeAmount * t.decimalOddsAtPlacement;
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
  const tournamentIsComplete = tournament.status === "COMPLETED";
  const enabled = sideBetsEnabled();

  const suggestedActions: string[] = [];
  if (activeContests > 0) {
    suggestedActions.push(`${activeContests} contest(s) ACTIVE — lock winner pool when secondary entries should close.`);
  }
  if (enabled && openSideBetMarkets > 0 && tournamentIsComplete) {
    suggestedActions.push(`${openSideBetMarkets} side-bet market(s) still OPEN — lock before settling.`);
  }
  if (enabled && lockedSideBetMarkets > 0 && tournamentIsComplete) {
    suggestedActions.push(`${lockedSideBetMarkets} locked market(s) ready to settle against final results.`);
  }
  if (enabled && openSideBetTickets > 0) {
    suggestedActions.push(`${openSideBetTickets} open parlay ticket(s) — open liability ${openLiability.toFixed(2)}.`);
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
      tournamentLineups: tournamentLineupCount,
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
