import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { createTtlCache } from "../../lib/ttlCache.js";
import { contestPrivyVisibilityOr } from "../../utils/contestListQuery.js";
import { lobbyMetadata } from "../../utils/contestEventSummary.js";
import { isEthereumAddress, normalizeContestAddress } from "../../utils/contestRouteParam.js";
import { formatOnchainPaymentsForContest } from "../../utils/formatOnchainPayments.js";
import type { DetailedResult } from "../shared/types.js";
import {
  attachReferralStakes,
  contestReferralNetworkBps,
  referralStakeForViewerByPrivyId,
} from "../referral/referralStakeForViewer.js";

export const CONTEST_LOBBY_CACHE_TTL_MS = 15_000;

const DEFAULT_USER_COLOR = "#9CA3AF";

const PARTICIPANT_IDENTITY_KEYS = [
  "firstName",
  "lastName",
  "displayName",
  "shortName",
  "imageUrl",
  "country",
  "countryFlag",
  "owgr",
  "driverNumber",
  "teamName",
  "teamColour",
  "headshotUrl",
  "countryCode",
  "sector",
  "iconKey",
  "symbol",
  "hlCoin",
  "hlDex",
] as const;

type ContestLobbyPayload = Record<string, unknown>;

const lobbyCache = createTtlCache<ContestLobbyPayload>(CONTEST_LOBBY_CACHE_TTL_MS);

export function contestLobbyCacheKey(address: string, privyUserId: string | null): string {
  return `${normalizeContestAddress(address)}:${privyUserId ?? "anon"}`;
}

export function contestLobbyCachePrefix(address: string): string {
  return `${normalizeContestAddress(address)}:`;
}

export function invalidateContestLobbyByAddress(address: string): void {
  lobbyCache.invalidatePrefix(contestLobbyCachePrefix(address));
}

function pickUserColor(settings: unknown): string {
  if (typeof settings !== "object" || settings === null) return DEFAULT_USER_COLOR;
  const maybeColor = (settings as { color?: unknown }).color;
  if (typeof maybeColor !== "string") return DEFAULT_USER_COLOR;
  const color = maybeColor.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : DEFAULT_USER_COLOR;
}

export function slimParticipantMetadata(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of PARTICIPANT_IDENTITY_KEYS) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return Object.keys(out).length > 0 ? out : null;
}

const lobbyLineupSelect = {
  id: true,
  name: true,
  prediction: true,
  eventId: true,
  contestId: true,
  createdAt: true,
  updatedAt: true,
  picks: {
    orderBy: { slotIndex: "asc" as const },
    select: {
      id: true,
      slotIndex: true,
      eventParticipantId: true,
      eventParticipant: {
        select: {
          scoreData: true,
          total: true,
          participant: {
            select: {
              id: true,
              displayName: true,
              externalId: true,
              metadata: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.LineupSelect;

const contestLobbySelect = {
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
  results: true,
  pickPopularity: true,
  pickPopularityLockedAt: true,
  commentary: true,
  commentaryGeneratedAt: true,
  commentaryFeed: true,
  commentaryFeedGeneratedAt: true,
  createdAt: true,
  updatedAt: true,
  userGroup: {
    select: {
      id: true,
      name: true,
    },
  },
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
  _count: {
    select: {
      contestLineups: true,
    },
  },
  contestLineups: {
    select: {
      id: true,
      contestId: true,
      userId: true,
      lineupId: true,
      position: true,
      score: true,
      baseScore: true,
      popularityBonus: true,
      status: true,
      entryId: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          settings: true,
        },
      },
      lineup: { select: lobbyLineupSelect },
    },
  },
  onchainPayments: {
    orderBy: [{ kind: "asc" as const }, { createdAt: "asc" as const }],
    select: {
      kind: true,
      amountWei: true,
      walletAddress: true,
      metadata: true,
      user: { select: { name: true, settings: true } },
    },
  },
} satisfies Prisma.ContestSelect;

type ContestLobbyRow = Prisma.ContestGetPayload<{ select: typeof contestLobbySelect }>;

function formatLobbyPicks(lineup: ContestLobbyRow["contestLineups"][number]["lineup"]) {
  const picks = lineup.picks.map((pick) => ({
    id: pick.id,
    slotIndex: pick.slotIndex,
    eventParticipantId: pick.eventParticipantId,
    participant: pick.eventParticipant.participant
      ? {
          id: pick.eventParticipant.participant.id,
          displayName: pick.eventParticipant.participant.displayName,
          externalId: pick.eventParticipant.participant.externalId,
          metadata: slimParticipantMetadata(pick.eventParticipant.participant.metadata),
        }
      : null,
    scoreData: pick.eventParticipant.scoreData,
    total: pick.eventParticipant.total,
  }));
  const score = picks.reduce((sum, pick) => sum + (pick.total ?? 0), 0);

  return {
    id: lineup.id,
    eventId: lineup.eventId,
    contestId: lineup.contestId,
    name: lineup.name,
    prediction: lineup.prediction,
    picks,
    score,
    createdAt: lineup.createdAt,
    updatedAt: lineup.updatedAt,
  };
}

function formatLobbyRow(row: ContestLobbyRow): ContestLobbyPayload {
  const maskPlayers = row.status === "OPEN";
  const contestLineups = row.contestLineups.map((entry) => ({
    id: entry.id,
    contestId: entry.contestId,
    userId: entry.userId,
    lineupId: entry.lineupId,
    position: entry.position,
    score: entry.score,
    baseScore: entry.baseScore,
    popularityBonus: entry.popularityBonus,
    status: entry.status,
    entryId: entry.entryId,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    user: entry.user
      ? {
          id: entry.user.id,
          name: entry.user.name,
          settings: { color: pickUserColor(entry.user.settings) },
        }
      : undefined,
    lineup: maskPlayers
      ? {
          id: entry.lineup.id,
          name: entry.lineup.name,
          prediction: entry.lineup.prediction,
        }
      : formatLobbyPicks(entry.lineup),
  }));

  const results = row.results as { detailedResults?: DetailedResult[] } | null;
  const contestSettings = row.settings as { oracle?: string } | null;
  const contestOracleAddress =
    typeof contestSettings?.oracle === "string" ? contestSettings.oracle : undefined;
  const onchainPayments =
    row.onchainPayments.length && (row.status === "SETTLED" || row.status === "CLOSED")
      ? formatOnchainPaymentsForContest(
          row.onchainPayments,
          results?.detailedResults,
          contestOracleAddress,
        )
      : undefined;

  const event = row.event;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    eventId: row.eventId,
    userGroupId: row.userGroupId,
    endTime: row.endTime,
    address: row.address,
    chainId: row.chainId,
    status: row.status,
    settings: row.settings,
    results: row.results,
    pickPopularity: row.pickPopularity,
    pickPopularityLockedAt: row.pickPopularityLockedAt,
    commentary: row.commentary,
    commentaryGeneratedAt: row.commentaryGeneratedAt,
    commentaryFeed: row.commentaryFeed,
    commentaryFeedGeneratedAt: row.commentaryFeedGeneratedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    userGroup: row.userGroup,
    event: {
      id: event.id,
      sportId: event.sportId,
      externalId: event.externalId,
      isActive: event.isActive,
      metadata: lobbyMetadata(event.metadata),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    },
    _count: row._count,
    contestLineups,
    ...(onchainPayments ? { onchainPayments } : {}),
  };
}

export async function loadContestLobby(
  routeParam: string,
  privyUserId: string | null,
): Promise<ContestLobbyPayload | null> {
  const trimmed = routeParam.trim();
  if (!trimmed) return null;

  const identityWhere = isEthereumAddress(trimmed)
    ? { address: { equals: trimmed, mode: "insensitive" as const } }
    : { id: trimmed };

  const row = await prisma.contest.findFirst({
    where: {
      ...identityWhere,
      OR: contestPrivyVisibilityOr(privyUserId),
    },
    select: contestLobbySelect,
  });

  if (!row) return null;
  return overlayViewerReferralStakes(formatLobbyRow(row), privyUserId);
}

async function overlayViewerReferralStakes(
  payload: ContestLobbyPayload,
  privyUserId: string | null,
): Promise<ContestLobbyPayload> {
  if (!privyUserId) return payload;
  if (contestReferralNetworkBps(payload.settings) <= 0) return payload;

  const lineups = payload.contestLineups;
  if (!Array.isArray(lineups) || lineups.length === 0) return payload;

  const contestantIds: string[] = [];
  for (const row of lineups) {
    if (!row || typeof row !== "object") continue;
    const userId = (row as { userId?: unknown }).userId;
    if (typeof userId === "string" && userId.length > 0) contestantIds.push(userId);
  }
  if (contestantIds.length === 0) return payload;

  const depths = await referralStakeForViewerByPrivyId(privyUserId, contestantIds);
  if (depths.size === 0) return payload;

  return {
    ...payload,
    contestLineups: attachReferralStakes(lineups as Array<{ userId: string }>, depths),
  };
}

export async function getContestLobby(
  routeParam: string,
  privyUserId: string | null,
  options?: { skipCache?: boolean },
): Promise<ContestLobbyPayload | null> {
  const trimmed = routeParam.trim();
  if (!trimmed) return null;

  // Cache is address-keyed so join/leave (database id) still invalidate lobby URLs.
  if (options?.skipCache || !isEthereumAddress(trimmed)) {
    return loadContestLobby(trimmed, privyUserId);
  }

  try {
    return await lobbyCache.getOrLoad(contestLobbyCacheKey(trimmed, privyUserId), async () => {
      const payload = await loadContestLobby(trimmed, privyUserId);
      if (!payload) throw new LobbyNotFoundError();
      return payload;
    });
  } catch (error) {
    if (error instanceof LobbyNotFoundError) return null;
    throw error;
  }
}

class LobbyNotFoundError extends Error {
  constructor() {
    super("Contest not found");
    this.name = "LobbyNotFoundError";
  }
}
