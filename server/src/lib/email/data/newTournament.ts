import { loadSummarySectionsFromFile } from "../../tournamentSummary.js";
import {
  formatTournamentSubtitle,
  loadTournamentForEmail,
  summarySectionsFromTournament,
} from "./tournament.js";
import type { NewTournamentEmailData } from "../emails/newTournament.js";

export async function loadNewTournamentEmailData(
  tournamentId: string,
): Promise<NewTournamentEmailData | null> {
  const tournament = await loadTournamentForEmail(tournamentId);
  if (!tournament) return null;

  let summarySections = summarySectionsFromTournament(tournament);
  if (!summarySections && tournament.pgaTourId) {
    summarySections = await loadSummarySectionsFromFile(tournament.pgaTourId);
  }

  return {
    tournamentName: tournament.name,
    subtitle: formatTournamentSubtitle(tournament),
    summarySections,
  };
}
