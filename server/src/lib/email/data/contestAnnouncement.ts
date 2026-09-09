import type { EmailAnnouncementContent, EmailAnnouncementSection } from "@cut/sport-sdk";
import { sportEmailContentFor } from "../../../sports/emailContentRegistry.js";
import { loadEventForEmail, type EmailEventRecord } from "./event.js";

export function parseEmailAnnouncementContent(raw: unknown): EmailAnnouncementContent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.courseLine !== "string" || typeof value.dateLine !== "string") {
    return null;
  }
  if (value.blurb !== null && typeof value.blurb !== "string") {
    return null;
  }
  if (!Array.isArray(value.leadSections) || !Array.isArray(value.bodySections)) {
    return null;
  }
  return {
    courseLine: value.courseLine,
    dateLine: value.dateLine,
    blurb: value.blurb,
    leadSections: value.leadSections as EmailAnnouncementSection[],
    bodySections: value.bodySections as EmailAnnouncementSection[],
  };
}

export function emailAnnouncementFromMetadata(metadata: unknown): EmailAnnouncementContent | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  return parseEmailAnnouncementContent(
    (metadata as { emailAnnouncement?: unknown }).emailAnnouncement,
  );
}

export async function compileEventAnnouncement(
  event: EmailEventRecord,
): Promise<EmailAnnouncementContent> {
  const adapter = sportEmailContentFor(event.sportId);
  return adapter.loadAnnouncementContent({
    sportId: event.sportId,
    externalId: event.externalId,
    name: event.name,
    metadata: event.metadata,
  });
}

export type ContestAnnouncementSource = {
  eventName: string;
  sportId: string;
  announcement: EmailAnnouncementContent;
};

export async function loadContestAnnouncementSource(
  eventId: string,
): Promise<ContestAnnouncementSource | null> {
  const event = await loadEventForEmail(eventId);
  if (!event) return null;

  const stored = parseEmailAnnouncementContent(event.emailAnnouncement);
  const announcement = stored ?? (await compileEventAnnouncement(event));

  return {
    eventName: event.name,
    sportId: event.sportId,
    announcement,
  };
}
