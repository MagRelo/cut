import { prisma } from "../lib/prisma.js";
import {
  formatLineupResponse,
  lineupDetailInclude,
  type LineupWithPicks,
} from "../services/lineups/formatLineup.js";

type ContestStatus = "OPEN" | "ACTIVE" | "LOCKED" | "SETTLED" | "CANCELLED" | "CLOSED";

const DEFAULT_USER_COLOR = "#9CA3AF";

function pickUserColor(settings: unknown): string {
  if (typeof settings !== "object" || settings === null) return DEFAULT_USER_COLOR;
  const maybeColor = (settings as { color?: unknown }).color;
  if (typeof maybeColor !== "string") return DEFAULT_USER_COLOR;
  const color = maybeColor.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : DEFAULT_USER_COLOR;
}

type ContestLineupRow = {
  id: string;
  contestId: string;
  userId: string;
  lineupId: string;
  position: number | null;
  score: number | null;
  baseScore?: number | null;
  popularityBonus?: number | null;
  status: string;
  entryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string | null;
    settings: unknown;
  } | null;
  lineup: {
    id: string;
    name: string;
    eventId?: string;
    prediction?: unknown;
  };
};

function formatContestLineup(
  contestLineup: ContestLineupRow,
  contestStatus: ContestStatus,
  lineupDetail?: LineupWithPicks,
) {
  const shouldMaskPlayers = contestStatus === "OPEN";

  return {
    id: contestLineup.id,
    contestId: contestLineup.contestId,
    userId: contestLineup.userId,
    lineupId: contestLineup.lineupId,
    position: contestLineup.position,
    score: contestLineup.score,
    baseScore: contestLineup.baseScore ?? null,
    popularityBonus: contestLineup.popularityBonus ?? null,
    status: contestLineup.status,
    entryId: contestLineup.entryId,
    createdAt: contestLineup.createdAt,
    updatedAt: contestLineup.updatedAt,
    user: contestLineup.user
      ? {
          id: contestLineup.user.id,
          name: contestLineup.user.name,
          settings: {
            color: pickUserColor(contestLineup.user.settings),
          },
        }
      : undefined,
    lineup: shouldMaskPlayers
      ? {
          id: contestLineup.lineup.id,
          name: contestLineup.lineup.name,
        }
      : lineupDetail
        ? formatLineupResponse(lineupDetail)
        : contestLineup.lineup,
  };
}

export function formatContestResponse<T extends {
  status: string;
  eventId?: string;
  contestLineups?: ContestLineupRow[];
}>(
  contest: T,
  lineupDetailsById?: Map<string, LineupWithPicks>,
  fallbackEventId?: string,
): T {
  if (!contest?.contestLineups) {
    return contest;
  }

  const eventId = contest.eventId ?? fallbackEventId;
  const contestStatus = contest.status as ContestStatus;

  return {
    ...contest,
    eventId,
    contestLineups: contest.contestLineups.map((lineup) =>
      formatContestLineup(
        lineup,
        contestStatus,
        lineupDetailsById?.get(lineup.lineupId),
      ),
    ),
  };
}

export async function loadLineupDetailsById(
  lineupIds: string[],
): Promise<Map<string, LineupWithPicks>> {
  if (lineupIds.length === 0) {
    return new Map();
  }

  const lineups = await prisma.lineup.findMany({
    where: { id: { in: lineupIds } },
    include: lineupDetailInclude,
  });

  return new Map(lineups.map((lineup) => [lineup.id, lineup]));
}
