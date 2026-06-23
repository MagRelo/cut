import crypto from "crypto";
import { golfPredictionValue } from "@cut/sport-pga-golf";
import { prisma } from "../lib/prisma.js";

export function normalizePlayerSet(playerIds: string[]): string {
  return [...playerIds].sort().join(",");
}

export function generateEntryId(userId: string, playerIds: string[]): string {
  const normalized = normalizePlayerSet(playerIds);
  const input = `${userId}:${normalized}`;
  const hash = crypto.createHash("sha256").update(input).digest("hex");
  return BigInt("0x" + hash.substring(0, 16)).toString();
}

export function hasMinimumPlayers(playerIds: string[]): boolean {
  return playerIds.length >= 1;
}

export function isRosterPredictionDuplicate(
  playerIds: string[],
  prediction: number | null | undefined,
  otherPlayerIds: string[],
  otherPrediction: number | null | undefined,
): boolean {
  if (playerIds.length === 0) {
    return false;
  }
  return (
    normalizePlayerSet(playerIds) === normalizePlayerSet(otherPlayerIds) &&
    prediction === otherPrediction
  );
}

export async function isDuplicateLineup(
  userId: string,
  eventId: string,
  participantIds: string[],
  prediction: number | null | undefined,
  excludeLineupId?: string,
  contestId?: string | null,
): Promise<boolean> {
  if (participantIds.length === 0) {
    return false;
  }

  const userLineups = await prisma.lineup.findMany({
    where: {
      userId,
      eventId,
      ...(contestId !== undefined ? { contestId } : {}),
    },
    include: {
      picks: {
        include: {
          eventParticipant: {
            select: { participantId: true },
          },
        },
      },
    },
  });

  return userLineups.some((lineup) => {
    if (excludeLineupId && lineup.id === excludeLineupId) {
      return false;
    }

    const lineupParticipantIds = lineup.picks.map(
      (pick) => pick.eventParticipant.participantId,
    );

    return isRosterPredictionDuplicate(
      participantIds,
      prediction,
      lineupParticipantIds,
      golfPredictionValue(lineup.prediction),
    );
  });
}

export async function isDuplicateInContest(
  userId: string,
  contestId: string,
  participantIds: string[],
  prediction: number | null | undefined,
  excludeLineupId?: string,
): Promise<boolean> {
  if (participantIds.length === 0) {
    return false;
  }

  const contestLineups = await prisma.contestLineup.findMany({
    where: { contestId, userId },
    include: {
      lineup: {
        include: {
          picks: {
            include: {
              eventParticipant: {
                select: { participantId: true },
              },
            },
          },
        },
      },
    },
  });

  return contestLineups.some((contestLineup) => {
    if (excludeLineupId && contestLineup.lineupId === excludeLineupId) {
      return false;
    }

    const lineupParticipantIds = contestLineup.lineup.picks.map(
      (pick) => pick.eventParticipant.participantId,
    );

    return isRosterPredictionDuplicate(
      participantIds,
      prediction,
      lineupParticipantIds,
      golfPredictionValue(contestLineup.lineup.prediction),
    );
  });
}

export async function getParticipantIdsFromLineup(lineupId: string): Promise<string[]> {
  const lineup = await prisma.lineup.findUnique({
    where: { id: lineupId },
    include: {
      picks: {
        include: {
          eventParticipant: {
            select: { participantId: true },
          },
        },
      },
    },
  });

  if (!lineup) {
    throw new Error("Lineup not found");
  }

  return lineup.picks.map((pick) => pick.eventParticipant.participantId);
}
