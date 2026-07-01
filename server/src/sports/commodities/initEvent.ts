import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { COMMODITIES_SPORT_ID } from "@cut/sport-commodities";
import { parseCommoditiesSessionExternalId, resolveWeekAnchorDates } from "./externalId.js";
import {
  formatSessionDisplayName,
  resolveSessionBoundsFromInit,
  type CommoditiesInitOptions,
} from "./sessionConfig.js";
import { mergeCommoditiesEventMetadata } from "./metadataMerge.js";
import { syncCommoditiesEventMetadata } from "./syncMetadata.js";
import { resolveCommodityFieldSnapshot, syncCommoditiesParticipantField } from "./syncField.js";

const DEFAULT_COMMODITY_BEAUTY_IMAGE = "/CommodityBG3.png";

export async function initCommoditiesEvent(
  externalId: string,
  options?: CommoditiesInitOptions,
) {
  const sessionWeek = parseCommoditiesSessionExternalId(externalId);
  const { monday, weekNumber } = resolveWeekAnchorDates(sessionWeek);
  const bounds = resolveSessionBoundsFromInit(sessionWeek, options);
  const fieldSnapshot = await resolveCommodityFieldSnapshot();

  if (fieldSnapshot.length === 0) {
    throw new Error("[commodities] No HL markets resolved for allowlist — cannot init event");
  }

  let event = await prisma.competitionEvent.findFirst({
    where: { sportId: COMMODITIES_SPORT_ID, externalId: sessionWeek },
  });

  const initialMetadata = mergeCommoditiesEventMetadata(event?.metadata, {
    name: formatSessionDisplayName(sessionWeek),
    beautyImage: DEFAULT_COMMODITY_BEAUTY_IMAGE,
    commodities: {
      sessionDate: monday,
      sessionWeek,
      weekNumber,
      sessionOpen: bounds.sessionOpen,
      sessionClose: bounds.sessionClose,
      sessionStarted: false,
      sessionComplete: false,
      fieldSnapshot,
    },
  });

  if (!event) {
    event = await prisma.competitionEvent.create({
      data: {
        sportId: COMMODITIES_SPORT_ID,
        externalId: sessionWeek,
        isActive: false,
        metadata: initialMetadata as Prisma.InputJsonValue,
      },
    });
  } else {
    await prisma.competitionEvent.update({
      where: { id: event.id },
      data: { metadata: initialMetadata as Prisma.InputJsonValue },
    });
  }

  await syncCommoditiesEventMetadata(event.id);
  await syncCommoditiesParticipantField(event.id);

  await prisma.competitionEvent.updateMany({
    where: { sportId: COMMODITIES_SPORT_ID, isActive: true },
    data: { isActive: false },
  });

  await prisma.competitionEvent.update({
    where: { id: event.id },
    data: { isActive: true },
  });

  console.log(`[commodities] Initialized event ${event.id} (${sessionWeek})`);
  console.log(`[commodities] Field size: ${fieldSnapshot.length} contracts`);
  console.log(`[commodities] Session open:  ${bounds.sessionOpen}`);
  console.log(`[commodities] Session close: ${bounds.sessionClose}`);
}
