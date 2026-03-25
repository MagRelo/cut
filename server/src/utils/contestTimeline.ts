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

/**
 * Build timeline chart data from ContestLineupTimeline snapshots for a contest.
 * Caller should ensure the contest exists (e.g. after findUnique).
 */
export async function getContestTimelineData(contestId: string): Promise<ContestTimelineData> {
  const snapshots = await prisma.contestLineupTimeline.findMany({
    where: {
      contestId,
    },
    include: {
      contestLineup: {
        include: {
          user: {
            select: {
              name: true,
              settings: true,
            },
          },
          tournamentLineup: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  const lineupMap = new Map<
    string,
    { name: string; color: string; dataPoints: ContestTimelineData["teams"][0]["dataPoints"] }
  >();

  for (const snapshot of snapshots) {
    const lineupId = snapshot.contestLineupId;

    if (!lineupMap.has(lineupId)) {
      const userName = snapshot.contestLineup.user.name;
      const userSettings = snapshot.contestLineup.user.settings as { color?: string } | null;
      const userColor = userSettings?.color;
      const resolvedColor = isValidHexColor(userColor) ? userColor : DEFAULT_USER_COLOR;
      const lineupName = snapshot.contestLineup.tournamentLineup.name;
      const displayName = `${userName} - ${lineupName}`;

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
