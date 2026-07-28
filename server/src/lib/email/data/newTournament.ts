import type { EmailAnnouncementContent } from "@cut/sport-sdk";
import { requireSportEmailContent } from "../../../sports/emailContentRegistry.js";
import { loadEventForEmail } from "./event.js";
import type { NewTournamentEmailData } from "../emails/newTournament.js";

export async function loadNewEventEmailData(
  eventId: string,
): Promise<NewTournamentEmailData | null> {
  const event = await loadEventForEmail(eventId);
  if (!event) return null;

  const adapter = requireSportEmailContent(event.sportId);
  const announcement: EmailAnnouncementContent = await adapter.loadAnnouncementContent({
    externalId: event.externalId,
    name: event.name,
    course: event.course,
    city: event.city,
    state: event.state,
    startDate: event.startDate,
    endDate: event.endDate,
    summarySections: event.summarySections,
  });

  return {
    tournamentName: event.name,
    sportId: event.sportId,
    announcement,
  };
}

/** @deprecated Use loadNewEventEmailData */
export async function loadNewTournamentEmailData(
  eventId: string,
): Promise<NewTournamentEmailData | null> {
  return loadNewEventEmailData(eventId);
}
