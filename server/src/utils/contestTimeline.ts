import { prisma } from "../lib/prisma.js";
import { getPeriodRulesForSport } from "../sports/periodRules.js";

const DEFAULT_USER_COLOR = "#9CA3AF";

function isValidHexColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
}

/** Stored `contest.results` JSON (minimal fields for timeline winner lines). */
type StoredContestResults = {
  winningEntries?: unknown[];
  detailedResults?: Array<{ entryId?: unknown; payoutBasisPoints?: number }>;
};

function normalizeEntryIdForCompare(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  const s = raw.trim();
  try {
    if (/^0x[0-9a-fA-F]+$/i.test(s)) return BigInt(s).toString(10);
    if (/^[0-9]+$/.test(s)) {
      const stripped = s.replace(/^0+/, "") || "0";
      return BigInt(stripped).toString(10);
    }
  } catch {
    return s;
  }
  return s;
}

function winnerNormalizedEntryIdSetFromResults(results: unknown): Set<string> {
  const set = new Set<string>();
  if (!results || typeof results !== "object") return set;
  const r = results as StoredContestResults;
  for (const id of r.winningEntries ?? []) {
    const n = normalizeEntryIdForCompare(typeof id === "string" ? id : String(id));
    if (n) set.add(n);
  }
  for (const row of r.detailedResults ?? []) {
    if (typeof row?.payoutBasisPoints === "number" && row.payoutBasisPoints > 0) {
      const n = normalizeEntryIdForCompare(
        row.entryId != null && row.entryId !== undefined ? String(row.entryId) : null,
      );
      if (n) set.add(n);
    }
  }
  return set;
}

export type ContestTimelineData = {
  /** Contest ended: show Final tab and winner-line styling when payout winners exist */
  contestFinished: boolean;
  /** Sport-specific period labels for chart dividers. */
  periods: ReturnType<typeof getPeriodRulesForSport>;
  teams: Array<{
    contestLineupId: string;
    userId: string;
    name: string;
    userName: string;
    color: string;
    entryId: string | null;
    isPrimaryPayoutWinner: boolean;
    dataPoints: Array<{
      timestamp: string;
      score: number;
      periodNumber: number;
      sharePrice: number | null;
    }>;
  }>;
};

type LineupMetaRow = {
  id: string;
  userId: string;
  entryId: string | null;
  user: { name: string; settings: unknown };
  lineup: { name: string };
};

function buildLineupMetaMap(rows: LineupMetaRow[]) {
  const map = new Map<
    string,
    { userId: string; name: string; userName: string; color: string; entryId: string | null }
  >();
  for (const row of rows) {
    const userSettings = row.user.settings as { color?: string } | null;
    const userColor = userSettings?.color;
    const resolvedColor = isValidHexColor(userColor) ? userColor : DEFAULT_USER_COLOR;
    const userName = row.user.name?.trim() || "Unknown";
    const displayName = `${userName} - ${row.lineup.name}`;
    map.set(row.id, {
      userId: row.userId,
      name: displayName,
      userName,
      color: resolvedColor,
      entryId: row.entryId,
    });
  }
  return map;
}

/**
 * Build timeline chart data from ContestLineupTimeline snapshots for a contest.
 * Includes `contestFinished` and per-team `isPrimaryPayoutWinner` so the client can render
 * without merging contest results or normalizing entry ids.
 */
export async function getContestTimelineData(contestId: string): Promise<ContestTimelineData> {
  const [contest, snapshots, lineupRows] = await Promise.all([
    prisma.contest.findUnique({
      where: { id: contestId },
      select: {
        status: true,
        results: true,
        event: { select: { sportId: true } },
      },
    }),
    prisma.contestLineupTimeline.findMany({
      where: { contestId },
      select: {
        contestLineupId: true,
        timestamp: true,
        score: true,
        periodNumber: true,
        sharePrice: true,
      },
      orderBy: { timestamp: "asc" },
    }),
    prisma.contestLineup.findMany({
      where: { contestId },
      select: {
        id: true,
        userId: true,
        entryId: true,
        user: { select: { name: true, settings: true } },
        lineup: { select: { name: true } },
      },
    }),
  ]);

  const contestFinished =
    contest?.status === "SETTLED" || contest?.status === "CLOSED";
  const winnerEntryIds = contestFinished
    ? winnerNormalizedEntryIdSetFromResults(contest?.results ?? null)
    : new Set<string>();

  const metaByLineupId = buildLineupMetaMap(lineupRows as LineupMetaRow[]);
  type LineupAccumulator = {
    contestLineupId: string;
    userId: string;
    name: string;
    userName: string;
    color: string;
    entryId: string | null;
    isPrimaryPayoutWinner: boolean;
    dataPoints: ContestTimelineData["teams"][0]["dataPoints"];
  };

  const lineupMap = new Map<string, LineupAccumulator>();

  for (const snapshot of snapshots) {
    const lineupId = snapshot.contestLineupId;

    if (!lineupMap.has(lineupId)) {
      const meta = metaByLineupId.get(lineupId);
      const displayName = meta?.name ?? "Unknown";
      const userName = meta?.userName ?? "Unknown";
      const resolvedColor = meta?.color ?? DEFAULT_USER_COLOR;
      const entryId = meta?.entryId ?? null;
      const normalized = normalizeEntryIdForCompare(entryId);
      const isPrimaryPayoutWinner = Boolean(
        contestFinished && normalized && winnerEntryIds.has(normalized),
      );
      lineupMap.set(lineupId, {
        contestLineupId: lineupId,
        userId: meta?.userId ?? "",
        name: displayName,
        userName,
        color: resolvedColor,
        entryId,
        isPrimaryPayoutWinner,
        dataPoints: [],
      });
    }

    const lineup = lineupMap.get(lineupId)!;
    lineup.dataPoints.push({
      timestamp: snapshot.timestamp.toISOString(),
      score: snapshot.score,
      periodNumber: snapshot.periodNumber,
      sharePrice: snapshot.sharePrice,
    });
  }

  const teams = Array.from(lineupMap.values())
    .map((lineup) => ({
      contestLineupId: lineup.contestLineupId,
      userId: lineup.userId,
      name: lineup.name,
      userName: lineup.userName,
      color: lineup.color,
      entryId: lineup.entryId,
      isPrimaryPayoutWinner: lineup.isPrimaryPayoutWinner,
      dataPoints: lineup.dataPoints,
    }))
    .sort((a, b) => {
      const aLatestScore = a.dataPoints[a.dataPoints.length - 1]?.score || 0;
      const bLatestScore = b.dataPoints[b.dataPoints.length - 1]?.score || 0;
      return bLatestScore - aLatestScore;
    });

  const periods = getPeriodRulesForSport(contest?.event?.sportId ?? "");

  return { contestFinished, periods, teams };
}
