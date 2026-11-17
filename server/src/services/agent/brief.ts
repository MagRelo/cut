import { Prisma } from "@prisma/client";
import { parseContestCommentaryFeedItems } from "@cut/sport-sdk";
import { prisma } from "../../lib/prisma.js";
import { buildLeagueInviteUrl, buildReferralUrl } from "../../lib/appUrl.js";
import { ensureUserReferralCode } from "../../lib/referralCode.js";
import {
  mergeAgentPreferences,
  readAgentPreferences,
  type AgentPreferences,
  type AgentPreferencesPatch,
} from "../../schemas/user.js";
import { primaryDepositFromSettings } from "../../utils/canDeleteLeagueContest.js";
import { contestVisibilityWhere } from "../../utils/contestListQuery.js";
import { eventStatusFromMetadata } from "../../utils/eventStatus.js";
import {
  resolveEventEndDateString,
  resolveEventStartDateString,
} from "../../utils/contestEventSummary.js";
import { humanFromWei, roundMoney } from "../../utils/paymentAmount.js";
import { getEventCandidates } from "../events/getEventCandidates.js";
import { getReferralSummary, publicReferralName } from "../referral/getReferralSummary.js";
import { readWalletUsdc } from "./balance.js";
import {
  decodeCursor,
  diffCompanion,
  type AgentCursorState,
  type ContestWatch,
  type WatchFeedItem,
  type WatchPick,
} from "./cursor.js";
import { classifyScout, openAffordableCount, type ScoutEvent, type ScoutInput } from "./fit.js";

const ENTRY_STATUSES = ["OPEN", "ACTIVE", "LOCKED", "SETTLED", "CANCELLED", "CLOSED"] as const;

type EntryStatus = (typeof ENTRY_STATUSES)[number];

export type AgentActor = {
  userId: string;
  address: string;
  chainId: number;
};

type ContestSettings = { referralNetworkBps?: unknown };

function depositOf(settings: unknown): number | null {
  const value = primaryDepositFromSettings(settings);
  return typeof value === "number" ? value : null;
}

function bpsOf(settings: unknown): number {
  if (!settings || typeof settings !== "object") return 0;
  const value = (settings as ContestSettings).referralNetworkBps;
  return typeof value === "number" ? value : 0;
}

function rosterSize(rules: unknown): number {
  if (!rules || typeof rules !== "object") return 0;
  const maxPicks = (rules as { maxPicks?: unknown }).maxPicks;
  return typeof maxPicks === "number" ? maxPicks : 0;
}

function predictionRange(rules: unknown): { min: number; max: number } {
  if (!rules || typeof rules !== "object") return { min: 0, max: 0 };
  const { min, max } = rules as { min?: unknown; max?: unknown };
  return {
    min: typeof min === "number" ? min : 0,
    max: typeof max === "number" ? max : 0,
  };
}

function eventName(metadata: unknown, externalId: string): string {
  if (metadata && typeof metadata === "object" && typeof (metadata as { name?: unknown }).name === "string") {
    const name = (metadata as { name: string }).name.trim();
    if (name) return name;
  }
  return externalId;
}

function eventOf(event: {
  id: string;
  sportId: string;
  externalId: string;
  metadata: unknown;
}): ScoutEvent {
  return {
    id: event.id,
    name: eventName(event.metadata, event.externalId),
    start: resolveEventStartDateString(event.metadata),
    end: resolveEventEndDateString(event.metadata),
    status: eventStatusFromMetadata(event.metadata, event.sportId),
  };
}

function scorePosition(scoreData: unknown): number | null {
  if (!scoreData || typeof scoreData !== "object") return null;
  const position = (scoreData as { position?: unknown }).position;
  return typeof position === "number" && Number.isFinite(position) ? position : null;
}

export function winnerFromResults(
  results: unknown,
): { winnerName: string; winningTotal: number } | null {
  if (!results || typeof results !== "object") return null;
  const detailed = (results as { detailedResults?: unknown }).detailedResults;
  if (!Array.isArray(detailed)) return null;
  const named = detailed.filter(
    (row): row is { username: string; score: number; position?: unknown; payoutBasisPoints?: unknown } =>
      !!row &&
      typeof row === "object" &&
      typeof (row as { username?: unknown }).username === "string" &&
      typeof (row as { score?: unknown }).score === "number",
  );
  const winner =
    named.find((row) => row.position === 1) ??
    named.find(
      (row) => typeof row.payoutBasisPoints === "number" && row.payoutBasisPoints > 0,
    ) ??
    named[0];
  if (!winner) return null;
  return { winnerName: winner.username, winningTotal: winner.score };
}

function feedItems(raw: unknown): WatchFeedItem[] {
  return parseContestCommentaryFeedItems(raw).map((item) => ({
    id: item.id,
    text: item.text,
    generatedAt: item.generatedAt,
    entryIds: item.subjects?.entryIds ?? [],
  }));
}

async function entryCounts(userId: string, chainId: number): Promise<Record<EntryStatus, number>> {
  const rows = await prisma.contestLineup.findMany({
    where: { userId, contest: { chainId } },
    select: { contestId: true, contest: { select: { status: true } } },
  });
  const counts: Record<EntryStatus, number> = {
    OPEN: 0,
    ACTIVE: 0,
    LOCKED: 0,
    SETTLED: 0,
    CANCELLED: 0,
    CLOSED: 0,
  };
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.contestId)) continue;
    seen.add(row.contestId);
    if ((ENTRY_STATUSES as readonly string[]).includes(row.contest.status)) {
      counts[row.contest.status as EntryStatus] += 1;
    }
  }
  return counts;
}

async function settledLeagueContestIds(userId: string, chainId: number): Promise<string[]> {
  const rows = await prisma.contest.findMany({
    where: {
      chainId,
      status: "SETTLED",
      userGroupId: { not: null },
      userGroup: { members: { some: { userId } } },
    },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

export async function getAgentAccount(actor: AgentActor) {
  const [user, balanceUsdc, summary, entries] = await Promise.all([
    prisma.user.findUnique({
      where: { id: actor.userId },
      select: {
        settings: true,
        referralCode: true,
        userGroups: {
          select: { role: true, userGroup: { select: { id: true, name: true } } },
        },
      },
    }),
    readWalletUsdc(actor.chainId, actor.address),
    getReferralSummary(actor.userId),
    entryCounts(actor.userId, actor.chainId),
  ]);
  const referralCode = user?.referralCode ?? (await ensureUserReferralCode(actor.userId));
  return {
    wallet: actor.address,
    chainId: actor.chainId,
    balanceUsdc,
    leagues: (user?.userGroups ?? []).map((membership) => ({
      id: membership.userGroup.id,
      name: membership.userGroup.name,
      role: membership.role,
    })),
    referral: {
      code: referralCode,
      url: buildReferralUrl(referralCode),
      totalEarned: summary.totalEarned,
    },
    entries,
    preferences: readAgentPreferences(user?.settings),
  };
}

export async function saveAgentPreferences(
  userId: string,
  patch: AgentPreferencesPatch,
): Promise<AgentPreferences | null> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });
  if (!existing) return null;
  const settings = mergeAgentPreferences(existing.settings, patch);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { settings: settings as Prisma.InputJsonValue },
    select: { settings: true },
  });
  return readAgentPreferences(updated.settings);
}

export async function getScoutBrief(actor: AgentActor, balanceUsdc?: number | null) {
  const balance = balanceUsdc === undefined ? await readWalletUsdc(actor.chainId, actor.address) : balanceUsdc;
  const [preferences, visibility] = await Promise.all([
    prisma.user.findUnique({ where: { id: actor.userId }, select: { settings: true } }),
    contestVisibilityWhere(actor.userId, { chainId: actor.chainId }),
  ]);
  const prefs = readAgentPreferences(preferences?.settings);
  const now = new Date();
  const contests = await prisma.contest.findMany({
    where: { ...visibility, status: "OPEN", endTime: { gt: now } },
    select: {
      id: true,
      name: true,
      chainId: true,
      status: true,
      userGroupId: true,
      endTime: true,
      settings: true,
      userGroup: { select: { name: true } },
      event: { select: { id: true, sportId: true, externalId: true, metadata: true } },
    },
    orderBy: { endTime: "asc" },
  });
  const eventIds = [...new Set(contests.map((contest) => contest.event.id))];
  const sportIds = [...new Set(contests.map((contest) => contest.event.sportId))];
  const [fieldCounts, sports, entered] = await Promise.all([
    eventIds.length === 0
      ? Promise.resolve([])
      : prisma.eventParticipant.groupBy({
          by: ["eventId"],
          where: { eventId: { in: eventIds } },
          _count: { _all: true },
        }),
    sportIds.length === 0
      ? Promise.resolve([])
      : prisma.sport.findMany({
          where: { id: { in: sportIds } },
          select: { id: true, rosterRules: true, predictionRules: true },
        }),
    prisma.contestLineup.findMany({
      where: { userId: actor.userId, contestId: { in: contests.map((contest) => contest.id) } },
      select: { contestId: true },
    }),
  ]);
  const fieldByEvent = new Map(fieldCounts.map((row) => [row.eventId, row._count._all]));
  const sportById = new Map(sports.map((sport) => [sport.id, sport]));
  const enteredIds = new Set(entered.map((row) => row.contestId));
  const inputs: ScoutInput[] = contests.map((contest) => {
    const sport = sportById.get(contest.event.sportId);
    return {
      contestId: contest.id,
      name: contest.name,
      sportId: contest.event.sportId,
      chainId: contest.chainId,
      status: contest.status,
      userGroupId: contest.userGroupId,
      userGroupName: contest.userGroup?.name ?? null,
      primaryDeposit: depositOf(contest.settings),
      endTime: contest.endTime.toISOString(),
      rosterSize: rosterSize(sport?.rosterRules),
      predictionRange: predictionRange(sport?.predictionRules),
      fieldCount: fieldByEvent.get(contest.event.id) ?? 0,
      alreadyEntered: enteredIds.has(contest.id),
      event: eventOf(contest.event),
    };
  });
  const classified = classifyScout(inputs, {
    balanceUsdc: balance,
    maxEntryFee: prefs.maxEntryFee,
    sports: prefs.sports,
    now,
  });
  return { balanceUsdc: balance, ...classified };
}

export async function getPicksBrief(actor: AgentActor, contestId: string) {
  const visibility = await contestVisibilityWhere(actor.userId, { chainId: actor.chainId });
  const contest = await prisma.contest.findFirst({
    where: { id: contestId, ...visibility },
    select: {
      id: true,
      name: true,
      chainId: true,
      status: true,
      userGroupId: true,
      endTime: true,
      settings: true,
      eventId: true,
      userGroup: { select: { name: true } },
      event: { select: { sportId: true } },
    },
  });
  if (!contest) return null;
  const [sport, candidates, lineups] = await Promise.all([
    prisma.sport.findUnique({
      where: { id: contest.event.sportId },
      select: { rosterRules: true, predictionRules: true },
    }),
    getEventCandidates(contest.event.sportId, contest.eventId),
    prisma.lineup.findMany({
      where: { userId: actor.userId, contestId: contest.id },
      orderBy: { updatedAt: "desc" },
      include: {
        picks: { orderBy: { slotIndex: "asc" }, select: { eventParticipantId: true, slotIndex: true } },
        contestLineups: {
          where: { userId: actor.userId, contestId: contest.id },
          select: { lineupId: true, position: true, score: true },
        },
      },
    }),
  ]);
  const lineup = lineups.find((row) => row.contestLineups.length > 0) ?? lineups[0] ?? null;
  const entry = lineup?.contestLineups[0] ?? null;
  return {
    contest: {
      contestId: contest.id,
      name: contest.name,
      sportId: contest.event.sportId,
      chainId: contest.chainId,
      status: contest.status,
      primaryDeposit: depositOf(contest.settings),
      rosterSize: rosterSize(sport?.rosterRules),
      predictionRange: predictionRange(sport?.predictionRules),
      endTime: contest.endTime.toISOString(),
      userGroupId: contest.userGroupId,
      userGroupName: contest.userGroup?.name ?? null,
    },
    lineup: lineup
      ? {
          lineupId: lineup.id,
          candidates: [...lineup.picks]
            .sort((a, b) => (a.slotIndex ?? 999) - (b.slotIndex ?? 999))
            .map((pick) => pick.eventParticipantId),
          prediction: lineup.prediction ?? null,
        }
      : null,
    entry: entry
      ? { lineupId: entry.lineupId, position: entry.position, total: entry.score }
      : null,
    candidates: candidates ?? [],
  };
}

async function watchesFor(actor: AgentActor): Promise<ContestWatch[]> {
  const rows = await prisma.contestLineup.findMany({
    where: { userId: actor.userId, contest: { chainId: actor.chainId } },
    orderBy: { updatedAt: "desc" },
    include: {
      contest: {
        select: {
          id: true,
          name: true,
          status: true,
          commentary: true,
          commentaryGeneratedAt: true,
          commentaryFeed: true,
          commentaryFeedGeneratedAt: true,
          event: { select: { sportId: true } },
          _count: { select: { contestLineups: true } },
        },
      },
      lineup: {
        include: {
          picks: {
            include: {
              eventParticipant: {
                select: {
                  id: true,
                  total: true,
                  scoreData: true,
                  participant: { select: { displayName: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  const payments = await prisma.onchainPayment.findMany({
    where: {
      userId: actor.userId,
      kind: { in: ["PRIMARY", "SECONDARY"] },
      contestId: { in: [...new Set(rows.map((row) => row.contestId))] },
    },
    select: {
      contestId: true,
      kind: true,
      amountWei: true,
      chainId: true,
      tokenAddress: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const payoutByContest = new Map<string, ContestWatch["payout"]>();
  for (const contestId of new Set(payments.map((payment) => payment.contestId).filter((id): id is string => !!id))) {
    const group = payments.filter((payment) => payment.contestId === contestId);
    const latest = group[0];
    if (!latest) continue;
    let total = 0;
    for (const payment of group) {
      const human = humanFromWei(payment.amountWei, payment.chainId, payment.tokenAddress);
      if (human != null) total += human;
    }
    payoutByContest.set(contestId, {
      amount: roundMoney(total),
      kind: latest.kind === "SECONDARY" ? "SECONDARY" : "PRIMARY",
    });
  }

  const seen = new Set<string>();
  const watches: ContestWatch[] = [];
  for (const row of rows) {
    if (seen.has(row.contestId)) continue;
    seen.add(row.contestId);
    const picks: WatchPick[] = [...row.lineup.picks]
      .sort((a, b) => (a.slotIndex ?? 999) - (b.slotIndex ?? 999))
      .map((pick) => ({
        eventParticipantId: pick.eventParticipantId,
        displayName: pick.eventParticipant.participant.displayName?.trim() || "Player",
        total: pick.eventParticipant.total,
        position: scorePosition(pick.eventParticipant.scoreData),
      }));
    watches.push({
      contestId: row.contest.id,
      name: row.contest.name,
      sportId: row.contest.event.sportId,
      status: row.contest.status,
      commentaryGeneratedAt: row.contest.commentaryGeneratedAt?.toISOString() ?? null,
      commentaryFeedGeneratedAt: row.contest.commentaryFeedGeneratedAt?.toISOString() ?? null,
      overview: row.contest.commentary,
      position: row.position,
      score: row.score,
      fieldSize: row.contest._count.contestLineups,
      entryIds: [row.id, row.entryId].filter((id): id is string => typeof id === "string" && id.length > 0),
      picks,
      feedItems: feedItems(row.contest.commentaryFeed),
      payout: payoutByContest.get(row.contestId) ?? null,
    });
  }
  return watches;
}

export async function getCompanionBrief(actor: AgentActor, previous: AgentCursorState | null) {
  const [rows, summary, seenSettled] = await Promise.all([
    watchesFor(actor),
    getReferralSummary(actor.userId),
    settledLeagueContestIds(actor.userId, actor.chainId),
  ]);
  return diffCompanion(previous, rows, {
    referralCount: summary.grandTotal,
    seenSettled,
  });
}

export async function getReferralBrief(actor: AgentActor) {
  const [user, summary, payments, recent] = await Promise.all([
    prisma.user.findUnique({
      where: { id: actor.userId },
      select: { referralCode: true, referredByUserId: true },
    }),
    getReferralSummary(actor.userId),
    prisma.onchainPayment.findMany({
      where: { userId: actor.userId, kind: "REFERRAL" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { contestId: true, amountWei: true, chainId: true, tokenAddress: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { referredByUserId: actor.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { name: true, createdAt: true },
    }),
  ]);
  const code = user?.referralCode ?? (await ensureUserReferralCode(actor.userId));
  return {
    code,
    url: buildReferralUrl(code),
    totalEarned: summary.totalEarned,
    recorded: Boolean(user?.referredByUserId),
    levels: summary.levels,
    earnings: payments.map((payment) => ({
      contestId: payment.contestId,
      amount: roundMoney(humanFromWei(payment.amountWei, payment.chainId, payment.tokenAddress) ?? 0),
      settledAt: payment.createdAt.toISOString(),
    })),
    recent: recent.map((invitee) => ({
      name: publicReferralName(invitee.name),
      depth: 1,
      joinedAt: invitee.createdAt.toISOString(),
    })),
  };
}

export async function getLeagueList(actor: AgentActor) {
  const [memberships, referralCode] = await Promise.all([
    prisma.userGroupMember.findMany({
      where: { userId: actor.userId },
      select: {
        role: true,
        userGroup: {
          select: {
            id: true,
            name: true,
            inviteCode: true,
            _count: { select: { members: true } },
            contests: { where: { chainId: actor.chainId }, select: { status: true } },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    }),
    ensureUserReferralCode(actor.userId),
  ]);
  return {
    leagues: memberships.map((membership) => {
      const group = membership.userGroup;
      const admin = membership.role === "ADMIN" && group.inviteCode;
      return {
        id: group.id,
        name: group.name,
        role: membership.role,
        memberCount: group._count.members,
        openContests: group.contests.filter((contest) => contest.status === "OPEN").length,
        activeContests: group.contests.filter((contest) => contest.status === "ACTIVE").length,
        invite: admin
          ? { code: group.inviteCode as string, url: buildLeagueInviteUrl(group.inviteCode as string, referralCode) }
          : null,
      };
    }),
  };
}

export async function getLeagueDetail(actor: AgentActor, leagueId: string) {
  const membership = await prisma.userGroupMember.findUnique({
    where: { userId_userGroupId: { userId: actor.userId, userGroupId: leagueId } },
    select: { role: true },
  });
  if (!membership) return null;
  const group = await prisma.userGroup.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      name: true,
      members: {
        select: { userId: true, user: { select: { name: true } } },
        orderBy: { joinedAt: "asc" },
      },
      contests: {
        where: { chainId: actor.chainId },
        orderBy: { endTime: "asc" },
        select: {
          id: true,
          name: true,
          status: true,
          settings: true,
          results: true,
          event: { select: { id: true, sportId: true, externalId: true, metadata: true } },
          contestLineups: { select: { userId: true } },
        },
      },
    },
  });
  if (!group) return null;
  const memberIds = group.members.map((member) => member.userId);
  return {
    league: {
      id: group.id,
      name: group.name,
      role: membership.role,
      memberCount: group.members.length,
    },
    members: group.members.map((member) => ({
      id: member.userId,
      name: member.user.name?.trim() || "Player",
    })),
    contests: group.contests.map((contest) => {
      const entered = new Set(contest.contestLineups.map((lineup) => lineup.userId));
      const summary = contest.status === "SETTLED" ? winnerFromResults(contest.results) : null;
      return {
        contestId: contest.id,
        name: contest.name,
        status: contest.status,
        event: eventOf(contest.event),
        primaryDeposit: depositOf(contest.settings),
        referralNetworkBps: bpsOf(contest.settings),
        entryCount: contest.contestLineups.length,
        memberCount: memberIds.length,
        missingMemberIds:
          contest.status === "OPEN" ? memberIds.filter((id) => !entered.has(id)) : [],
        summary,
      };
    }),
  };
}

async function getLeagueTick(actor: AgentActor, previous: AgentCursorState | null) {
  const events = await prisma.competitionEvent.findMany({
    where: { isActive: true },
    select: { id: true, sportId: true, metadata: true },
  });
  const scheduled = events
    .filter((event) => eventStatusFromMetadata(event.metadata, event.sportId) === "SCHEDULED")
    .map((event) => event.id);
  const memberships = await prisma.userGroupMember.findMany({
    where: { userId: actor.userId },
    select: { role: true, userGroupId: true },
  });
  const groupIds = memberships.map((membership) => membership.userGroupId);
  const adminIds = memberships
    .filter((membership) => membership.role === "ADMIN")
    .map((membership) => membership.userGroupId);
  const openContests =
    scheduled.length === 0 || adminIds.length === 0
      ? []
      : await prisma.contest.findMany({
          where: {
            chainId: actor.chainId,
            status: "OPEN",
            userGroupId: { in: adminIds },
            eventId: { in: scheduled },
          },
          select: { userGroupId: true },
        });
  const covered = new Set(openContests.map((contest) => contest.userGroupId));
  const needsContest =
    scheduled.length === 0 ? [] : adminIds.filter((id) => !covered.has(id));

  const unenteredRows =
    groupIds.length === 0
      ? []
      : await prisma.contest.findMany({
          where: { chainId: actor.chainId, status: "OPEN", userGroupId: { in: groupIds } },
          select: {
            id: true,
            userGroupId: true,
            userGroup: { select: { members: { select: { userId: true } } } },
            contestLineups: { select: { userId: true } },
          },
        });
  const unentered = unenteredRows.flatMap((contest) => {
    const entered = new Set(contest.contestLineups.map((lineup) => lineup.userId));
    const missingMemberIds = (contest.userGroup?.members ?? [])
      .map((member) => member.userId)
      .filter((id) => !entered.has(id));
    if (missingMemberIds.length === 0 || !contest.userGroupId) return [];
    return [{ contestId: contest.id, leagueId: contest.userGroupId, missingMemberIds }];
  });

  const settledRows =
    groupIds.length === 0
      ? []
      : await prisma.contest.findMany({
          where: { chainId: actor.chainId, status: "SETTLED", userGroupId: { in: groupIds } },
          select: { id: true, userGroupId: true, results: true },
        });
  const seen = new Set(previous?.seenSettled ?? []);
  const settled = previous
    ? settledRows.flatMap((contest) => {
        if (seen.has(contest.id) || !contest.userGroupId) return [];
        const winner = winnerFromResults(contest.results);
        return [
          {
            contestId: contest.id,
            leagueId: contest.userGroupId,
            winnerName: winner?.winnerName ?? null,
            winningTotal: winner?.winningTotal ?? null,
          },
        ];
      })
    : [];

  return { needsContest, unentered, settled };
}

export async function getAgentTick(actor: AgentActor, cursor: string | undefined) {
  const previous = cursor ? decodeCursor(cursor) : null;
  const balanceUsdc = await readWalletUsdc(actor.chainId, actor.address);
  const [scout, companion, referrals, leagues] = await Promise.all([
    getScoutBrief(actor, balanceUsdc),
    getCompanionBrief(actor, previous),
    getReferralBrief(actor),
    getLeagueTick(actor, previous),
  ]);
  const downline = referrals.levels.reduce((total, level) => total + level.count, 0);
  return {
    cursor: companion.cursor,
    account: { balanceUsdc },
    scout: { openAffordable: openAffordableCount(scout.contests) },
    companion: { updates: companion.updates, unchanged: companion.unchanged },
    leagues,
    referrals: {
      totalEarned: referrals.totalEarned,
      newMembers: previous ? Math.max(0, downline - previous.referralCount) : 0,
    },
  };
}
