import type { Candidate } from "@cut/sport-sdk";
import { parseContestCommentaryFeedItems } from "@cut/sport-sdk";
import { prisma } from "../../lib/prisma.js";
import { primaryDepositFromSettings } from "../../utils/canDeleteLeagueContest.js";
import { contestViewerVisibilityOr } from "../../utils/contestListQuery.js";
import { isEthereumAddress } from "../../utils/contestRouteParam.js";
import { humanFromWei, roundMoney } from "../../utils/paymentAmount.js";
import { settledPotForContestRow } from "../../utils/settledPot.js";
import { getEventCandidates } from "../events/getEventCandidates.js";
import { getContestTimelineData, type ContestTimelineData } from "../../utils/contestTimeline.js";
import { getContestLobby } from "./getContestLobby.js";
import {
  directoryEventFromRecord,
  type ContestDirectoryEvent,
} from "../../utils/contestEventSummary.js";

const DEFAULT_USER_COLOR = "#9CA3AF";
const CONTEST_STATUSES = ["OPEN", "ACTIVE", "LOCKED", "SETTLED", "CANCELLED", "CLOSED"] as const;
type ContestStatus = (typeof CONTEST_STATUSES)[number];

function isContestStatus(value: string): value is ContestStatus {
  return (CONTEST_STATUSES as readonly string[]).includes(value);
}

export const COMPANION_SECTIONS = ["timeline", "commentary", "standings"] as const;
export type CompanionSection = (typeof COMPANION_SECTIONS)[number];

export function pickUserColor(settings: unknown): string {
  if (typeof settings !== "object" || settings === null) return DEFAULT_USER_COLOR;
  const maybeColor = (settings as { color?: unknown }).color;
  if (typeof maybeColor !== "string") return DEFAULT_USER_COLOR;
  const color = maybeColor.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : DEFAULT_USER_COLOR;
}

export function parseCompanionInclude(
  raw: string | undefined,
): { ok: true; sections: Set<CompanionSection> } | { ok: false; error: string } {
  if (!raw || !raw.trim()) {
    return { ok: true, sections: new Set(COMPANION_SECTIONS) };
  }
  const sections = new Set<CompanionSection>();
  for (const part of raw.split(",")) {
    const token = part.trim();
    if (!token) continue;
    if (!COMPANION_SECTIONS.includes(token as CompanionSection)) {
      return { ok: false, error: "Invalid include" };
    }
    sections.add(token as CompanionSection);
  }
  if (sections.size === 0) return { ok: false, error: "Invalid include" };
  return { ok: true, sections };
}

export function parseSince(
  raw: string | undefined,
): { ok: true; since: Date | null } | { ok: false; error: string } {
  if (!raw) return { ok: true, since: null };
  const since = new Date(raw);
  if (Number.isNaN(since.getTime())) return { ok: false, error: "Invalid since timestamp" };
  return { ok: true, since };
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

function identityWhere(routeParam: string) {
  const trimmed = routeParam.trim();
  return isEthereumAddress(trimmed)
    ? { address: { equals: trimmed, mode: "insensitive" as const } }
    : { id: trimmed };
}

function numberSetting(settings: unknown, key: string): number | null {
  if (!settings || typeof settings !== "object") return null;
  const value = (settings as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

export async function loadContestIdentity(
  routeParam: string,
  viewer?: { privyUserId?: string | null; userId?: string | null },
) {
  const trimmed = routeParam.trim();
  if (!trimmed) return null;
  const row = await prisma.contest.findFirst({
    where: {
      ...identityWhere(trimmed),
      OR: contestViewerVisibilityOr({
        privyUserId: viewer?.privyUserId,
        userId: viewer?.userId,
      }),
    },
    select: {
      id: true,
      name: true,
      description: true,
      eventId: true,
      userGroupId: true,
      endTime: true,
      address: true,
      chainId: true,
      status: true,
      settings: true,
      userGroup: { select: { id: true, name: true } },
      event: {
        select: {
          id: true,
          sportId: true,
          externalId: true,
          isActive: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          sport: { select: { id: true, name: true, rosterRules: true, predictionRules: true } },
        },
      },
      _count: { select: { contestLineups: true } },
      onchainPayments: { select: { kind: true, amountWei: true } },
      contestLineups: viewer?.userId
        ? {
            where: { userId: viewer.userId },
            take: 1,
            select: { lineupId: true, entryId: true, position: true, score: true },
          }
        : false,
    },
  });
  if (!row) return null;
  const mine = Array.isArray(row.contestLineups) ? row.contestLineups[0] : undefined;
  const event = directoryEventFromRecord(row.event);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    eventId: row.eventId,
    userGroupId: row.userGroupId,
    userGroup: row.userGroup,
    endTime: row.endTime,
    address: row.address,
    chainId: row.chainId,
    pot: settledPotForContestRow(row),
    entryCount: row._count.contestLineups,
    event,
    rules: {
      rosterSize: rosterSize(row.event.sport.rosterRules),
      predictionRange: predictionRange(row.event.sport.predictionRules),
      primaryDeposit: primaryDepositFromSettings(row.settings) ?? null,
      referralNetworkBps: numberSetting(row.settings, "referralNetworkBps"),
      primaryDepositSecondarySubsidyBps: numberSetting(
        row.settings,
        "primaryDepositSecondarySubsidyBps",
      ),
      expiryTimestamp: numberSetting(row.settings, "expiryTimestamp"),
    },
    myEntry: mine
      ? {
          lineupId: mine.lineupId,
          entryId: mine.entryId,
          position: mine.position,
          total: mine.score,
        }
      : null,
  };
}

export type ContestCard = {
  id: string;
  name: string;
  status: string;
  eventId: string;
  chainId: number;
  address: string | null;
  userGroupId: string | null;
  userGroupName: string | null;
  primaryDeposit: number | null;
  endTime: string;
  entryCount: number;
  pot: number | null;
  entered: boolean;
  event: ContestDirectoryEvent;
};

export async function listContestCards(input: {
  userId?: string | null;
  privyUserId?: string | null;
  eventId?: string;
  leagueId?: string;
  chainId?: number;
  status?: string;
  entered?: boolean;
  scope?: "live" | "past" | "all";
}): Promise<ContestCard[]> {
  const visibility = contestViewerVisibilityOr({
    privyUserId: input.privyUserId,
    userId: input.userId,
  });
  const statusFilter: ContestStatus | { not: ContestStatus } =
    input.status && isContestStatus(input.status) ? input.status : { not: "CANCELLED" };
  const rows = await prisma.contest.findMany({
    where: {
      OR: visibility,
      status: statusFilter,
      ...(input.eventId ? { eventId: input.eventId } : {}),
      ...(input.leagueId ? { userGroupId: input.leagueId } : {}),
      ...(input.chainId !== undefined ? { chainId: input.chainId } : {}),
      ...(input.entered && input.userId
        ? { contestLineups: { some: { userId: input.userId } } }
        : {}),
    },
    select: {
      id: true,
      name: true,
      status: true,
      eventId: true,
      chainId: true,
      address: true,
      userGroupId: true,
      endTime: true,
      settings: true,
      userGroup: { select: { name: true } },
      event: {
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
      },
      _count: { select: { contestLineups: true } },
      onchainPayments: { select: { kind: true, amountWei: true } },
      contestLineups: input.userId
        ? { where: { userId: input.userId }, select: { id: true }, take: 1 }
        : false,
    },
    orderBy: { endTime: "asc" },
  });

  return rows
    .filter((row) => {
      if (!input.scope || input.scope === "all") return true;
      const event = directoryEventFromRecord(row.event);
      const live = row.status === "ACTIVE" || row.status === "LOCKED";
      if (input.scope === "live") return live;
      return row.status === "SETTLED" || row.status === "CLOSED" || event.endDate != null;
    })
    .map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      eventId: row.eventId,
      chainId: row.chainId,
      address: row.address,
      userGroupId: row.userGroupId,
      userGroupName: row.userGroup?.name ?? null,
      primaryDeposit: (() => {
        const deposit = primaryDepositFromSettings(row.settings);
        return typeof deposit === "number" ? deposit : null;
      })(),
      endTime: row.endTime.toISOString(),
      entryCount: row._count.contestLineups,
      pot: settledPotForContestRow(row),
      entered: Array.isArray(row.contestLineups) && row.contestLineups.length > 0,
      event: directoryEventFromRecord(row.event),
    }));
}

export async function loadContestBoard(
  routeParam: string,
  privyUserId: string | null,
  userId?: string | null,
) {
  const lobby = await getContestLobby(routeParam, privyUserId, {
    ...(userId !== undefined ? { userId } : {}),
  });
  if (!lobby) return null;
  const board = { ...lobby };
  delete board.commentary;
  delete board.commentaryGeneratedAt;
  delete board.commentaryFeed;
  delete board.commentaryFeedGeneratedAt;
  return board;
}

export async function loadContestCommentary(contestId: string, since: Date | null) {
  const row = await prisma.contest.findUnique({
    where: { id: contestId },
    select: {
      id: true,
      name: true,
      status: true,
      userGroupId: true,
      endTime: true,
      commentary: true,
      commentaryGeneratedAt: true,
      commentaryFeed: true,
      commentaryFeedGeneratedAt: true,
    },
  });
  if (!row) return null;
  const generatedAt = row.commentaryGeneratedAt;
  const overviewFresh = !since || (generatedAt != null && generatedAt.getTime() > since.getTime());
  const items = parseContestCommentaryFeedItems(row.commentaryFeed).filter((item) => {
    if (!since) return true;
    const at = new Date(item.generatedAt);
    return !Number.isNaN(at.getTime()) && at.getTime() > since.getTime();
  });
  return {
    contest: {
      id: row.id,
      name: row.name,
      status: row.status,
      userGroupId: row.userGroupId,
      endTime: row.endTime.toISOString(),
    },
    commentary: overviewFresh ? row.commentary : null,
    commentaryGeneratedAt: overviewFresh ? (generatedAt?.toISOString() ?? null) : null,
    commentaryFeed: items,
  };
}

export async function loadContestStandings(contestId: string) {
  const rows = await prisma.contestLineup.findMany({
    where: { contestId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      userId: true,
      position: true,
      score: true,
      user: { select: { name: true, settings: true } },
    },
  });
  return rows.map((row) => ({
    contestLineupId: row.id,
    userId: row.userId,
    userName: row.user?.name?.trim() || "Unknown",
    color: pickUserColor(row.user?.settings),
    position: row.position,
    score: row.score,
  }));
}

export async function loadContestCompanion(
  contestId: string,
  options: { since: Date | null; sections: Set<CompanionSection> },
) {
  const header = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { id: true, name: true, status: true, userGroupId: true, endTime: true },
  });
  if (!header) return null;

  const body: {
    contest: {
      id: string;
      name: string;
      status: string;
      userGroupId: string | null;
      endTime: string;
    };
    standings?: Awaited<ReturnType<typeof loadContestStandings>>;
    timeline?: ContestTimelineData;
    commentary?: string | null;
    commentaryGeneratedAt?: string | null;
    commentaryFeed?: ReturnType<typeof parseContestCommentaryFeedItems>;
  } = {
    contest: {
      id: header.id,
      name: header.name,
      status: header.status,
      userGroupId: header.userGroupId,
      endTime: header.endTime.toISOString(),
    },
  };

  if (options.sections.has("standings")) {
    body.standings = await loadContestStandings(contestId);
  }
  if (options.sections.has("timeline")) {
    body.timeline = await getContestTimelineData(
      contestId,
      options.since ? { since: options.since } : undefined,
    );
  }
  if (options.sections.has("commentary")) {
    const commentary = await loadContestCommentary(contestId, options.since);
    if (commentary) {
      body.commentary = commentary.commentary;
      body.commentaryGeneratedAt = commentary.commentaryGeneratedAt;
      body.commentaryFeed = commentary.commentaryFeed;
    }
  }
  return body;
}

export async function loadEventField(
  eventId: string,
  view: "card" | "full",
): Promise<Candidate[] | Array<Pick<Candidate, "eventParticipantId" | "displayName" | "sortKeys">> | null> {
  const event = await prisma.competitionEvent.findUnique({
    where: { id: eventId },
    select: { id: true, sportId: true },
  });
  if (!event) return null;
  const candidates = await getEventCandidates(event.sportId, event.id);
  if (candidates === null) return null;
  if (view === "full") return candidates;
  return candidates.map((candidate) => ({
    eventParticipantId: candidate.eventParticipantId,
    displayName: candidate.displayName,
    sortKeys: candidate.sortKeys,
  }));
}

export async function listAccountEntries(userId: string) {
  const rows = await prisma.contestLineup.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      lineupId: true,
      position: true,
      score: true,
      contestId: true,
      contest: { select: { id: true, status: true, chainId: true, settings: true } },
    },
  });
  const payments = await prisma.onchainPayment.findMany({
    where: {
      userId,
      kind: { in: ["PRIMARY", "SECONDARY"] },
      contestId: { in: rows.map((row) => row.contestId) },
    },
    select: { contestId: true, amountWei: true, chainId: true, tokenAddress: true },
  });
  const payoutByContest = new Map<string, number>();
  for (const payment of payments) {
    if (!payment.contestId) continue;
    const amount = humanFromWei(payment.amountWei, payment.chainId, payment.tokenAddress);
    if (amount == null) continue;
    payoutByContest.set(payment.contestId, (payoutByContest.get(payment.contestId) ?? 0) + amount);
  }
  return rows.map((row) => {
    const payout = payoutByContest.get(row.contestId);
    return {
      contestId: row.contest.id,
      status: row.contest.status,
      lineupId: row.lineupId,
      position: row.position,
      total: row.score,
      payout: payout == null ? null : roundMoney(payout),
    };
  });
}
