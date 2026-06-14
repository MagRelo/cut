import { golfPredictionValue } from "@cut/sport-pga-golf";
import { prisma } from "../../lib/prisma.js";
import {
  DUPLICATE_LINEUP_PREDICTION_MESSAGE,
  randomWinningScorePrediction,
} from "../../utils/winningScorePrediction.js";
import { isDuplicateLineup } from "../../utils/lineupValidation.js";
import {
  formatLineupResponse,
  lineupDetailInclude,
} from "./formatLineup.js";
import { markSideBetMarketStaleAfterRosterChange } from "../sideBets/markSideBetMarketStaleAfterRosterChange.js";
import { validateLineupPicks, writeLineupPicks } from "./validateLineupPicks.js";

export type CreateLineupInput = {
  userId: string;
  eventId: string;
  picks: string[];
  name?: string;
  prediction?: unknown;
};

function resolvePrediction(prediction: unknown | undefined) {
  if (prediction !== undefined) {
    return prediction as object;
  }
  return { type: "winningScore", value: randomWinningScorePrediction() };
}

export async function createLineupForEvent(input: CreateLineupInput) {
  const event = await prisma.competitionEvent.findUnique({
    where: { id: input.eventId },
    select: { id: true, sportId: true },
  });

  if (!event) {
    return { error: "not_found" as const };
  }

  const validated = await validateLineupPicks(input.eventId, event.sportId, input.picks);
  if (!validated.ok) {
    if (validated.error === "not_found") {
      return { error: "not_found" as const };
    }
    return { error: "validation" as const, messages: validated.messages };
  }

  const prediction = resolvePrediction(input.prediction);
  const predictionValue = golfPredictionValue(prediction);

  const isDuplicate = await isDuplicateLineup(
    input.userId,
    input.eventId,
    validated.participantIds,
    predictionValue,
  );
  if (isDuplicate) {
    return {
      error: "duplicate" as const,
      message: DUPLICATE_LINEUP_PREDICTION_MESSAGE,
    };
  }

  const lineup = await prisma.lineup.create({
    data: {
      userId: input.userId,
      eventId: input.eventId,
      name: input.name ?? "My Lineup",
      prediction,
    },
  });

  await writeLineupPicks(lineup.id, input.picks);

  const saved = await prisma.lineup.findUniqueOrThrow({
    where: { id: lineup.id },
    include: lineupDetailInclude,
  });

  await markSideBetMarketStaleAfterRosterChange(lineup.id);

  return { lineup: formatLineupResponse(saved) };
}
