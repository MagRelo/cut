import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import {
  compileEventAnnouncement,
} from "./data/contestAnnouncement.js";
import { loadEventForEmail } from "./data/event.js";

function metadataRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

export async function prepareEventAnnouncementEmail(eventId: string): Promise<boolean> {
  const event = await loadEventForEmail(eventId);
  if (!event) return false;

  const announcement = await compileEventAnnouncement(event);
  const row = await prisma.competitionEvent.findUnique({
    where: { id: eventId },
    select: { metadata: true },
  });
  if (!row) return false;

  const metadata = metadataRecord(row.metadata);
  await prisma.competitionEvent.update({
    where: { id: eventId },
    data: {
      metadata: {
        ...metadata,
        emailAnnouncement: announcement,
        emailAnnouncementPreparedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  });

  return true;
}

export async function prepareEventAnnouncementEmailSafe(eventId: string): Promise<void> {
  try {
    const prepared = await prepareEventAnnouncementEmail(eventId);
    if (prepared) {
      console.log(`[email] Prepared contest announcement snapshot for event ${eventId}`);
    }
  } catch (error) {
    console.error(`[email] Failed to prepare contest announcement for event ${eventId}:`, error);
  }
}
