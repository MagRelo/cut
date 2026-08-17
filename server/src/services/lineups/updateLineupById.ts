import { prisma } from "../../lib/prisma.js";
import { DUPLICATE_LINEUP_PREDICTION_MESSAGE } from "../../utils/lineupPrediction.js";
import {
  predictionValueForSport,
  resolveLineupPredictionForWrite,
} from "../../utils/sportPrediction.js";
import { isDuplicateLineup } from "../../utils/lineupValidation.js";
import {
  formatLineupResponse,
  lineupDetailInclude,
} from "./formatLineup.js";
import { markSideBetMarketStaleAfterRosterChange } from "../sideBets/markSideBetMarketStaleAfterRosterChange.js";
import { validateLineupPicks, writeLineupPicks } from "./validateLineupPicks.js";
import { getLineupEditBlock, lineupEditBlockToHttp } from "../../utils/lineupEditable.js";

export type UpdateLineupInput = {
  userId: string;
  lineupId: string;
  picks: string[];
  name?: string;
  prediction?: unknown;
};

export async function updateLineupById(input: UpdateLineupInput) {
  const existing = await prisma.lineup.findFirst({
    where: { id: input.lineupId, userId: input.userId },
    include: { event: { select: { sportId: true } } },
  });

  if (!existing) {
    return { error: "not_found" as const };
  }

  const editBlock = await getLineupEditBlock(input.lineupId, input.userId);
  if (editBlock) {
    const http = lineupEditBlockToHttp(editBlock);
    return {
      error: "not_editable" as const,
      status: http.status,
      body: http.body,
    };
  }

  const validated = await validateLineupPicks(
    existing.eventId,
    existing.event.sportId,
    input.picks,
  );
  if (!validated.ok) {
    if (validated.error === "not_found") {
      return { error: "not_found" as const };
    }
    return { error: "validation" as const, messages: validated.messages };
  }

  let prediction = existing.prediction;
  if (input.prediction !== undefined) {
    const resolvedPrediction = await resolveLineupPredictionForWrite(
      existing.event.sportId,
      input.prediction,
    );
    if (!resolvedPrediction.ok) {
      return {
        error: "validation" as const,
        messages: ["Prediction is outside the allowed range for this sport"],
      };
    }
    prediction = resolvedPrediction.prediction;
  }
  const predictionValue = predictionValueForSport(existing.event.sportId, prediction);

  const isDuplicate = await isDuplicateLineup(
    input.userId,
    existing.eventId,
    validated.participantIds,
    predictionValue,
    input.lineupId,
    existing.contestId ?? undefined,
  );
  if (isDuplicate) {
    return {
      error: "duplicate" as const,
      message: DUPLICATE_LINEUP_PREDICTION_MESSAGE,
    };
  }

  await prisma.lineup.update({
    where: { id: input.lineupId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.prediction !== undefined ? { prediction: prediction as object } : {}),
    },
  });

  await writeLineupPicks(input.lineupId, input.picks);

  const saved = await prisma.lineup.findUniqueOrThrow({
    where: { id: input.lineupId },
    include: lineupDetailInclude,
  });

  await markSideBetMarketStaleAfterRosterChange(input.lineupId);

  return { lineup: formatLineupResponse(saved) };
}
