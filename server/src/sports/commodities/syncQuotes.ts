import { Prisma } from "@prisma/client";
import type { CommodityParticipantMetadata } from "@cut/sport-commodities";
import { COMMODITIES_SPORT_ID, getEventFieldSnapshot } from "@cut/sport-commodities";
import { prisma } from "../../lib/prisma.js";
import { commodityExternalId } from "@cut/sport-commodities";
import { fetchQuotesForField, marketQuoteToSnapshot } from "./marketDataProvider.js";

function parseParticipantMetadata(metadata: unknown): CommodityParticipantMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as CommodityParticipantMetadata;
}

/** Refresh quote snapshots on participant metadata (init + cron). */
export async function syncCommoditiesQuotes(eventId: string): Promise<void> {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: COMMODITIES_SPORT_ID },
    select: { metadata: true },
  });

  if (!event) {
    throw new Error(`Commodities event not found: ${eventId}`);
  }

  const field = getEventFieldSnapshot(event.metadata);
  if (field.length === 0) {
    return;
  }

  const quotes = await fetchQuotesForField(field);

  const participants = await prisma.participant.findMany({
    where: { sportId: COMMODITIES_SPORT_ID },
    select: { id: true, externalId: true, metadata: true },
  });
  const participantByExternalId = new Map(
    participants.map((row) => [row.externalId, row]),
  );

  let updated = 0;
  for (const entry of field) {
    const quote = quotes.get(entry.ticker);
    if (!quote) {
      continue;
    }

    const externalId = commodityExternalId(entry.ticker);
    const row = participantByExternalId.get(externalId);
    if (!row) {
      continue;
    }

    const existingMeta = parseParticipantMetadata(row.metadata);
    await prisma.participant.update({
      where: { id: row.id },
      data: {
        metadata: {
          ...existingMeta,
          quote: marketQuoteToSnapshot(quote),
        } as unknown as Prisma.InputJsonValue,
      },
    });
    updated += 1;
  }

  console.log(
    `[commodities] Synced quotes for ${updated}/${field.length} symbols (event ${eventId})`,
  );
}
