import { Prisma } from "@prisma/client";
import {
  COMMODITIES_SPORT_ID,
  commoditiesEventStatusFromMetadata,
  getEventFieldSnapshot,
  parseCommoditiesEventMetadata,
  parseCommodityParticipantMetadata,
} from "@cut/sport-commodities";
import { prisma } from "../../lib/prisma.js";
import { commodityExternalId } from "@cut/sport-commodities";
import {
  fetchCandidatePriceHistoryForField,
  fetchQuotesForField,
  fetchSessionSparklineHistoryForField,
} from "./marketDataProvider.js";
import { appendLiveMark } from "./priceHistoryUtils.js";
import { resolveCommoditiesSessionDate } from "./sessionConfig.js";

/** Refresh picker + live participant sparkline data on participant metadata (init + cron). */
export async function syncCommoditiesPriceHistory(eventId: string): Promise<void> {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: COMMODITIES_SPORT_ID },
  });

  if (!event) {
    throw new Error(`Commodities event not found: ${eventId}`);
  }

  const commodities = parseCommoditiesEventMetadata(event.metadata);
  if (!commodities?.sessionOpen || !commodities?.sessionClose) {
    return;
  }

  const field = getEventFieldSnapshot(event.metadata);
  if (field.length === 0) {
    return;
  }

  const isComplete = commoditiesEventStatusFromMetadata(event.metadata) === "COMPLETE";
  const sessionDate = resolveCommoditiesSessionDate(commodities.sessionDate, event.externalId);
  const [candidateHistories, sessionHistories, quotes] = await Promise.all([
    fetchCandidatePriceHistoryForField(field),
    fetchSessionSparklineHistoryForField(
      field,
      sessionDate,
      commodities.sessionOpen,
      commodities.sessionClose,
      isComplete,
    ),
    fetchQuotesForField(field),
  ]);

  const participants = await prisma.participant.findMany({
    where: { sportId: COMMODITIES_SPORT_ID },
    select: { id: true, externalId: true, metadata: true },
  });
  const participantByExternalId = new Map(
    participants.map((row) => [row.externalId, row]),
  );

  for (const entry of field) {
    const externalId = commodityExternalId(entry.ticker);
    const row = participantByExternalId.get(externalId);
    if (!row) {
      continue;
    }

    const existingMeta = parseCommodityParticipantMetadata(row.metadata);
    const mark = quotes.get(entry.ticker)?.markPrice;
    const priceHistory = appendLiveMark(candidateHistories.get(entry.ticker) ?? [], mark);
    const sessionPriceHistory = appendLiveMark(sessionHistories.get(entry.ticker) ?? [], mark);

    await prisma.participant.update({
      where: { id: row.id },
      data: {
        metadata: {
          ...existingMeta,
          priceHistory,
          sessionPriceHistory,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  console.log(`[commodities] Price history synced for event ${eventId}`);
}
