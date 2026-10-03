import {
  golfEventStatusFromMetadata,
  parseGolfEventMetadata,
  PGA_GOLF_SPORT_ID,
} from "@cut/sport-pga-golf";
import { prisma } from "../../lib/prisma.js";
import { prepareEventAnnouncementEmailSafe } from "../../lib/email/prepareEventAnnouncement.js";

function startMs(metadata: unknown): number | null {
  const golf = parseGolfEventMetadata(metadata);
  if (!golf?.startDate) return null;
  const ms = Date.parse(golf.startDate);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * When the active golf event is COMPLETE, activate the prepared next event
 * (created with `activate: false` during a live round / playoff).
 */
export async function maybePromotePreparedGolfEvent(): Promise<{
  promoted: boolean;
  fromId?: string;
  toId?: string;
}> {
  const active = await prisma.competitionEvent.findFirst({
    where: { sportId: PGA_GOLF_SPORT_ID, isActive: true },
  });
  if (!active) return { promoted: false };
  if (golfEventStatusFromMetadata(active.metadata) !== "COMPLETE") {
    return { promoted: false };
  }

  const prepared = await prisma.competitionEvent.findMany({
    where: { sportId: PGA_GOLF_SPORT_ID, isActive: false },
  });

  const activeStart = startMs(active.metadata);
  const later = prepared
    .map((event) => ({ event, start: startMs(event.metadata) }))
    .filter((row): row is { event: (typeof prepared)[number]; start: number } => {
      if (row.start == null) return false;
      const status = golfEventStatusFromMetadata(row.event.metadata);
      if (status === "COMPLETE") return false;
      if (activeStart != null && row.start <= activeStart) return false;
      return true;
    })
    .sort((a, b) => a.start - b.start);

  const next = later[0]?.event;
  if (!next) return { promoted: false };

  await prisma.competitionEvent.updateMany({
    where: { sportId: PGA_GOLF_SPORT_ID, isActive: true },
    data: { isActive: false },
  });
  await prisma.competitionEvent.update({
    where: { id: next.id },
    data: { isActive: true },
  });
  await prepareEventAnnouncementEmailSafe(next.id);

  console.log(
    `[pga-golf] Promoted prepared event ${next.id} (${next.externalId}); previous ${active.id} (${active.externalId})`,
  );
  return { promoted: true, fromId: active.id, toId: next.id };
}
