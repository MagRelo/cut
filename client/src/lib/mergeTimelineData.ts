import type { TimelineData, TimelineDataPoint, TimelineTeam } from "../types/contest";

/** Latest ISO timestamp across all team data points, or null if empty. */
export function maxTimelineTimestamp(data: TimelineData | undefined): string | null {
  if (!data?.teams.length) return null;
  let max: string | null = null;
  for (const team of data.teams) {
    for (const point of team.dataPoints) {
      if (!max || point.timestamp > max) {
        max = point.timestamp;
      }
    }
  }
  return max;
}

function latestScore(team: TimelineTeam): number {
  return team.dataPoints[team.dataPoints.length - 1]?.score ?? 0;
}

function appendPoints(
  existing: TimelineDataPoint[],
  incoming: TimelineDataPoint[],
): TimelineDataPoint[] {
  if (!incoming.length) return existing;
  if (!existing.length) return [...incoming];

  const lastTs = existing[existing.length - 1]?.timestamp;
  const toAppend = lastTs
    ? incoming.filter((point) => point.timestamp > lastTs)
    : incoming;

  if (!toAppend.length) return existing;
  return [...existing, ...toAppend];
}

/**
 * Merge a timeline delta (or full payload) into cached timeline data.
 * Upserts teams by contestLineupId; appends points with timestamp after the team's last point.
 */
export function mergeTimelineData(
  cached: TimelineData | undefined,
  delta: TimelineData,
): TimelineData {
  if (!cached?.teams.length) {
    return {
      contestFinished: delta.contestFinished,
      periods: delta.periods,
      teams: [...delta.teams].sort((a, b) => latestScore(b) - latestScore(a)),
    };
  }

  const byId = new Map<string, TimelineTeam>();
  for (const team of cached.teams) {
    byId.set(team.contestLineupId, { ...team, dataPoints: [...team.dataPoints] });
  }

  for (const incoming of delta.teams) {
    const existing = byId.get(incoming.contestLineupId);
    if (!existing) {
      byId.set(incoming.contestLineupId, {
        ...incoming,
        dataPoints: [...incoming.dataPoints],
      });
      continue;
    }

    byId.set(incoming.contestLineupId, {
      ...existing,
      userId: incoming.userId,
      name: incoming.name,
      userName: incoming.userName ?? existing.userName,
      color: incoming.color,
      entryId: incoming.entryId !== undefined ? incoming.entryId : existing.entryId,
      isPrimaryPayoutWinner:
        incoming.isPrimaryPayoutWinner !== undefined
          ? incoming.isPrimaryPayoutWinner
          : existing.isPrimaryPayoutWinner,
      dataPoints: appendPoints(existing.dataPoints, incoming.dataPoints),
    });
  }

  const teams = Array.from(byId.values()).sort((a, b) => latestScore(b) - latestScore(a));

  return {
    contestFinished: delta.contestFinished ?? cached.contestFinished,
    periods: delta.periods !== undefined ? delta.periods : cached.periods,
    teams,
  };
}
