import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { COMMODITIES_SPORT_ID, parseCommoditiesEventMetadata } from "@cut/sport-commodities";
import { parseCommoditiesSessionExternalId, resolveWeekAnchorDates } from "./externalId.js";
import { formatSessionDisplayName, resolveWeeklySessionBounds } from "./sessionConfig.js";
import { mergeCommoditiesEventMetadata } from "./metadataMerge.js";
import {
  commoditiesCurrentPeriod,
  commoditiesPeriodDisplay,
  commoditiesPeriodStatusDisplay,
} from "./sessionRounds.js";

export async function syncCommoditiesEventMetadata(eventId: string) {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: COMMODITIES_SPORT_ID },
  });

  if (!event) {
    throw new Error(`Commodities event not found: ${eventId}`);
  }

  const sessionWeek = parseCommoditiesSessionExternalId(event.externalId);
  const { monday, weekNumber } = resolveWeekAnchorDates(sessionWeek);
  const defaultBounds = resolveWeeklySessionBounds(sessionWeek);
  const existingCommodities = parseCommoditiesEventMetadata(event.metadata);
  const sessionOpen = existingCommodities?.sessionOpen ?? defaultBounds.sessionOpen;
  const sessionClose = existingCommodities?.sessionClose ?? defaultBounds.sessionClose;

  const now = new Date();
  const sessionStarted =
    existingCommodities?.sessionStarted === true || now >= new Date(sessionOpen);
  const sessionComplete =
    existingCommodities?.sessionComplete === true || now >= new Date(sessionClose);
  const currentPeriod = commoditiesCurrentPeriod(sessionOpen, sessionClose, now);

  const commoditiesPatch: {
    sessionDate: string;
    sessionWeek: string;
    weekNumber: number;
    sessionOpen?: string;
    sessionClose?: string;
    sessionStarted: boolean;
    sessionComplete: boolean;
  } = {
    sessionDate: monday,
    sessionWeek,
    weekNumber,
    sessionStarted,
    sessionComplete,
  };

  if (!existingCommodities?.sessionOpen) {
    commoditiesPatch.sessionOpen = defaultBounds.sessionOpen;
  }
  if (!existingCommodities?.sessionClose) {
    commoditiesPatch.sessionClose = defaultBounds.sessionClose;
  }

  const metadata = mergeCommoditiesEventMetadata(event.metadata, {
    name: formatSessionDisplayName(sessionWeek),
    periodDisplay: commoditiesPeriodDisplay(currentPeriod),
    currentPeriod,
    periodStatusDisplay: commoditiesPeriodStatusDisplay(currentPeriod, sessionComplete),
    commodities: commoditiesPatch,
  });

  await prisma.competitionEvent.update({
    where: { id: event.id },
    data: { metadata: metadata as Prisma.InputJsonValue },
  });
}
