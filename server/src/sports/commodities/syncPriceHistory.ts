import { Prisma } from "@prisma/client";
import type { CommodityParticipantMetadata } from "@cut/sport-commodities";
import {
  COMMODITIES_SPORT_ID,
  commoditiesEventStatusFromMetadata,
  getEventFieldSnapshot,
  parseCommoditiesEventMetadata,
} from "@cut/sport-commodities";
import { prisma } from "../../lib/prisma.js";
import { commodityExternalId } from "@cut/sport-commodities";
import {
  fetchQuotesForField,
  fetchSessionSparklineHistoryForField,
} from "./marketDataProvider.js";
import { appendLiveMark } from "./priceHistoryUtils.js";

function parseParticipantMetadata(metadata: unknown): CommodityParticipantMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as CommodityParticipantMetadata;
}

/** Refresh intraday session sparklines on participant metadata (init + cron). */
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
  const [histories, quotes] = await Promise.all([
    fetchSessionSparklineHistoryForField(
      field,
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

    const existingMeta = parseParticipantMetadata(row.metadata);
    const closes = histories.get(entry.ticker) ?? [];
    const mark = quotes.get(entry.ticker)?.markPrice;
    const priceHistory = appendLiveMark(closes, mark);

    await prisma.participant.update({
      where: { id: row.id },
      data: {
        metadata: {
          ...existingMeta,
          priceHistory,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  console.log(`[commodities] Session sparklines synced for event ${eventId}`);
}
