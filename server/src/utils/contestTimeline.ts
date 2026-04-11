import { prisma } from "../lib/prisma.js";

const DEFAULT_USER_COLOR = "#9CA3AF";

function isValidHexColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
}

export type ContestTimelineData = {
  teams: Array<{
    name: string;
    color: string;
    dataPoints: Array<{
      timestamp: string;
      score: number;
      roundNumber: number;
      sharePrice: number | null;
    }>;
  }>;
};

type LineupMetaRow = {
  id: string;
  user: { name: string; settings: unknown };
  tournamentLineup: { name: string };
};

function buildLineupLabelMap(rows: LineupMetaRow[]) {
  const map = new Map<string, { name: string; color: string }>();
  for (const row of rows) {
    const userSettings = row.user.settings as { color?: string } | null;
    const userColor = userSettings?.color;
    const resolvedColor = isValidHexColor(userColor) ? userColor : DEFAULT_USER_COLOR;
    const displayName = `${row.user.name} - ${row.tournamentLineup.name}`;
    map.set(row.id, { name: displayName, color: resolvedColor });
  }
  return map;
}

/**
 * Build timeline chart data from ContestLineupTimeline snapshots for a contest.
 * Uses scalar snapshot rows plus one metadata query (avoids per-row joins on snapshots).
 */
export async function getContestTimelineData(contestId: string): Promise<ContestTimelineData> {
  const [snapshots, lineupRows] = await Promise.all([
    prisma.contestLineupTimeline.findMany({
      where: { contestId },
      select: {
        contestLineupId: true,
        timestamp: true,
        score: true,
        roundNumber: true,
        sharePrice: true,
      },
      orderBy: { timestamp: "asc" },
    }),
    prisma.contestLineup.findMany({
      where: { contestId },
      select: {
        id: true,
        user: { select: { name: true, settings: true } },
        tournamentLineup: { select: { name: true } },
      },
    }),
  ]);

  const metaByLineupId = buildLineupLabelMap(lineupRows as LineupMetaRow[]);
  const lineupMap = new Map<
    string,
    { name: string; color: string; dataPoints: ContestTimelineData["teams"][0]["dataPoints"] }
  >();

  for (const snapshot of snapshots) {
    const lineupId = snapshot.contestLineupId;

    if (!lineupMap.has(lineupId)) {
      const meta = metaByLineupId.get(lineupId);
      const displayName = meta?.name ?? "Unknown";
      const resolvedColor = meta?.color ?? DEFAULT_USER_COLOR;
      lineupMap.set(lineupId, {
        name: displayName,
        color: resolvedColor,
        dataPoints: [],
      });
    }

    const lineup = lineupMap.get(lineupId)!;
    lineup.dataPoints.push({
      timestamp: snapshot.timestamp.toISOString(),
      score: snapshot.score,
      roundNumber: snapshot.roundNumber,
      sharePrice: snapshot.sharePrice,
    });
  }

  const teams = Array.from(lineupMap.values())
    .map((lineup) => ({
      name: lineup.name,
      color: lineup.color,
      dataPoints: lineup.dataPoints,
    }))
    .sort((a, b) => {
      const aLatestScore = a.dataPoints[a.dataPoints.length - 1]?.score || 0;
      const bLatestScore = b.dataPoints[b.dataPoints.length - 1]?.score || 0;
      return bLatestScore - aLatestScore;
    });

  return { teams };
}
