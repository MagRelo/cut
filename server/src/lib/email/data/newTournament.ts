import { loadSummarySectionsFromFile } from "../../tournamentSummary.js";
import {
  formatEventSubtitle,
  loadEventForEmail,
  summarySectionsFromEvent,
} from "./event.js";
import type { NewTournamentEmailData } from "../emails/newTournament.js";

export async function loadNewEventEmailData(
  eventId: string,
): Promise<NewTournamentEmailData | null> {
  const event = await loadEventForEmail(eventId);
  if (!event) return null;

  let summarySections = summarySectionsFromEvent(event);
  if (!summarySections) {
    summarySections = await loadSummarySectionsFromFile(event.externalId);
  }

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
