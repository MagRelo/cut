import { prisma } from "../../lib/prisma.js";
import { getTournament } from "../../lib/pgaTournament.js";
import { PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";
import { prepareEventAnnouncementEmailSafe } from "../../lib/email/prepareEventAnnouncement.js";
import { syncGolfEventMetadata } from "./syncMetadata.js";
import { syncGolfParticipantField } from "./syncField.js";

export type InitGolfEventOptions = {
  /** Default true. False prepares the event without flipping `isActive`. */
  activate?: boolean;
};

export async function initGolfEvent(externalId: string, options?: InitGolfEventOptions) {
  const pgaTourId = externalId.trim();
  if (!pgaTourId) {
    throw new Error("externalId (PGA tournament id) is required");
  }

  const tournamentData = await getTournament(pgaTourId);
  const activate = options?.activate !== false;

  let event = await prisma.competitionEvent.findFirst({
    where: { sportId: PGA_GOLF_SPORT_ID, externalId: pgaTourId },
  });

  if (!event) {
    event = await prisma.competitionEvent.create({
      data: {
        sportId: PGA_GOLF_SPORT_ID,
        externalId: pgaTourId,
        isActive: false,
        metadata: {
          name: tournamentData.tournamentName,
          pgaTourId,
          status: tournamentData.tournamentStatus ?? "UPCOMING",
        },
      },
    });
  }

  await syncGolfEventMetadata(event.id, { seedBeautyImage: true });
  await syncGolfParticipantField(event.id);

  if (activate) {
    await prisma.competitionEvent.updateMany({
      where: { sportId: PGA_GOLF_SPORT_ID, isActive: true },
      data: { isActive: false },
    });

    await prisma.competitionEvent.update({
      where: { id: event.id },
      data: { isActive: true },
    });
  }

  await prepareEventAnnouncementEmailSafe(event.id);

  console.log(
    `[pga-golf] Initialized event ${event.id} (${pgaTourId})${activate ? "" : " (prepared, not active)"}`,
  );
  return { id: event.id, externalId: pgaTourId, activated: activate };
}
