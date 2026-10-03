import { isGolfEventCompleteRaw } from "@cut/sport-pga-golf";
import { getActivePlayers } from "../../lib/pgaField.js";
import { fetchPgaSchedule, type PgaScheduleTournament } from "../../lib/pgaSchedule.js";
import { getTournament } from "../../lib/pgaTournament.js";
import { parseTournamentDates } from "./parseTournamentDates.js";
import { pickNextGolfEvent, type NextGolfEventPick } from "./pickNextGolfEvent.js";

const MAX_SCHEDULE_ITEMS = 20;

export type ResolveNextGolfEventOptions = {
  now?: Date;
  currentExternalId?: string | null;
  fetchSchedule?: (year: number) => Promise<PgaScheduleTournament[]>;
  fetchTournament?: (id: string) => Promise<{
    tournamentName: string;
    tournamentStatus?: string;
    displayDate: string;
    timezone: string;
    seasonYear: number;
  }>;
  fetchField?: (id: string) => Promise<{ players: unknown[] }>;
};

export async function resolveNextGolfEvent(
  options: ResolveNextGolfEventOptions = {},
): Promise<NextGolfEventPick | null> {
  const now = options.now ?? new Date();
  const year = now.getUTCFullYear();
  const fetchSchedule = options.fetchSchedule ?? fetchPgaSchedule;
  const fetchTournament = options.fetchTournament ?? getTournament;
  const fetchField = options.fetchField ?? getActivePlayers;

  let schedule = await fetchSchedule(year);
  if (schedule.length === 0) {
    schedule = await fetchSchedule(year + 1);
  }

  const detailed = [];
  for (const item of schedule.slice(0, MAX_SCHEDULE_ITEMS)) {
    try {
      const tournament = await fetchTournament(item.id);
      const dates = parseTournamentDates(
        tournament.displayDate,
        tournament.timezone,
        tournament.seasonYear,
      );
      const status = tournament.tournamentStatus ?? "UPCOMING";
      let fieldSize = 0;
      if (!isGolfEventCompleteRaw(status)) {
        try {
          const field = await fetchField(item.id);
          fieldSize = Array.isArray(field.players) ? field.players.length : 0;
        } catch {
          fieldSize = 0;
        }
      }
      detailed.push({
        id: item.id,
        tournamentName: tournament.tournamentName || item.tournamentName,
        status,
        startDate: dates?.startDate ?? null,
        fieldSize,
      });
    } catch (error) {
      console.warn(
        `[pga-golf] Skipping schedule id ${item.id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return pickNextGolfEvent(detailed, options.currentExternalId ?? null);
}
