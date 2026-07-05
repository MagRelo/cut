import { prisma } from "../../lib/prisma.js";
import { DUPLICATE_LINEUP_PREDICTION_MESSAGE } from "../../utils/lineupPrediction.js";
import {
  defaultPredictionForSport,
  predictionValueForSport,
} from "../../utils/sportPrediction.js";
import { isDuplicateLineup } from "../../utils/lineupValidation.js";
import {
  formatLineupResponse,
  lineupDetailInclude,
} from "./formatLineup.js";
import { markSideBetMarketStaleAfterRosterChange } from "../sideBets/markSideBetMarketStaleAfterRosterChange.js";
import { validateLineupPicks, writeLineupPicks } from "./validateLineupPicks.js";
import { validateLineupContestScope } from "./validateLineupContestScope.js";
import { getContestEditBlock, getEventEditBlock, lineupEditBlockToHttp } from "../../utils/lineupEditable.js";

export type CreateLineupInput = {
  userId: string;
  eventId: string;
  picks: string[];
  name?: string;
  prediction?: unknown;
  contestId?: string;
};

async function resolvePrediction(sportId: string, prediction: unknown | undefined) {
  if (prediction !== undefined && prediction !== null) {
    return prediction as object;
  }
  return defaultPredictionForSport(sportId);
}

export async function createLineupForEvent(input: CreateLineupInput) {
  const event = await prisma.competitionEvent.findUnique({
    where: { id: input.eventId },
    select: { id: true, sportId: true },
  });

  if (!event) {
    return { error: "not_found" as const };
  }

  const eventBlock = await getEventEditBlock(event.id, event.sportId);
  if (eventBlock) {
    const http = lineupEditBlockToHttp(eventBlock);
    return {
      error: "not_editable" as const,
      status: http.status,
      body: http.body,
    };
  }

  if (input.contestId) {
    const contestBlock = await getContestEditBlock(input.contestId);
    if (contestBlock) {
      const http = lineupEditBlockToHttp(contestBlock);
      return {
        error: "not_editable" as const,
        status: http.status,
        body: http.body,
      };
    }

    const scope = await validateLineupContestScope(
      input.userId,
      input.eventId,
      input.contestId,
    );
    if (!scope.ok) {
      return { error: scope.error };
    }
  }

  const validated = await validateLineupPicks(input.eventId, event.sportId, input.picks);
  if (!validated.ok) {
    if (validated.error === "not_found") {
      return { error: "not_found" as const };
    }
    return { error: "validation" as const, messages: validated.messages };
  }

  const prediction = await resolvePrediction(event.sportId, input.prediction);
  const predictionValue = predictionValueForSport(event.sportId, prediction);

  const isDuplicate = await isDuplicateLineup(
    input.userId,
    input.eventId,
    validated.participantIds,
    predictionValue,
    undefined,
    input.contestId ?? undefined,
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
      ...(input.contestId ? { contestId: input.contestId } : {}),
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
