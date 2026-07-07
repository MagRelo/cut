import { resolveSummarySectionsForEvent } from "../../tournamentSummary.js";
import {
  formatEventSubtitle,
  loadEventForEmail,
} from "./event.js";
import type { NewTournamentEmailData } from "../emails/newTournament.js";

export async function loadNewEventEmailData(
  eventId: string,
): Promise<NewTournamentEmailData | null> {
  const event = await loadEventForEmail(eventId);
  if (!event) return null;

  const summarySections = await resolveSummarySectionsForEvent(
    event.externalId,
    event.summarySections,
  );

  return {
    tournamentName: event.name,
    subtitle: formatEventSubtitle(event),
    summarySections,
  };
}

/** @deprecated Use loadNewEventEmailData */
export async function loadNewTournamentEmailData(
  eventId: string,
): Promise<NewTournamentEmailData | null> {
  return loadNewEventEmailData(eventId);
}
