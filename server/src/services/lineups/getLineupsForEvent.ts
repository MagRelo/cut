import { prisma } from "../../lib/prisma.js";
import { formatContestResponse } from "../../utils/formatContestResponse.js";
import { formatLineupResponse, lineupDetailInclude } from "./formatLineup.js";

const contestSelectForLineupList = {
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
  createdAt: true,
  updatedAt: true,
} as const;

export async function getLineupsForEvent(userId: string, eventId: string) {
  const lineups = await prisma.lineup.findMany({
    where: { userId, eventId },
    include: {
      ...lineupDetailInclude,
      contestLineups: {
        where: {
          contest: { eventId },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              settings: true,
            },
          },
          contest: {
            select: contestSelectForLineupList,
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return lineups.map((lineup) => ({
    ...formatLineupResponse(lineup),
    contestLineups: lineup.contestLineups.map((contestLineup) => ({
      id: contestLineup.id,
      contestId: contestLineup.contestId,
      userId: contestLineup.userId,
      lineupId: contestLineup.lineupId,
      position: contestLineup.position ?? 0,
      score: contestLineup.score,
      baseScore: contestLineup.baseScore,
      popularityBonus: contestLineup.popularityBonus,
      status: contestLineup.status,
      entryId: contestLineup.entryId,
      createdAt: contestLineup.createdAt,
      updatedAt: contestLineup.updatedAt,
      user: contestLineup.user,
      contest: formatContestResponse(contestLineup.contest, undefined, eventId),
    })),
  }));
}
