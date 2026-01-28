// this service will run periodcally to keep the tournament up to date

import { prisma } from "../lib/prisma.js";
import { getTournament, formatWeather } from "../lib/pgaTournament.js";
import { fromZonedTime } from "date-fns-tz";
import { parse } from "date-fns";

/**
 * Parses PGA Tour displayDate and timezone to extract start and end dates with times.
 * Used so the DB keeps startDate/endDate in sync with PGA data.
 */
export function parseTournamentDates(
  displayDate: string,
  timezone: string,
  _seasonYear: number,
): { startDate: Date; endDate: Date } | null {
  try {
    const singleMonthPattern = /^(\w+)\s+(\d+)\s*-\s*(\d+),\s*(\d{4})$/;
    const twoMonthsSameYearPattern = /^(\w+)\s+(\d+)\s*-\s*(\w+)\s+(\d+),\s*(\d{4})$/;
    const multiMonthPattern = /^(\w+)\s+(\d+),?\s+(\d{4})\s*-\s*(\w+)\s+(\d+),?\s+(\d{4})$/;

    let startDateStr: string;
    let endDateStr: string;

    const singleMatch = displayDate.match(singleMonthPattern);
    if (singleMatch) {
      const [, month, startDay, endDay, year] = singleMatch;
      startDateStr = `${month} ${startDay}, ${year}`;
      endDateStr = `${month} ${endDay}, ${year}`;
    } else {
      const twoMonthsMatch = displayDate.match(twoMonthsSameYearPattern);
      if (twoMonthsMatch) {
        const [, startMonth, startDay, endMonth, endDay, year] = twoMonthsMatch;
        startDateStr = `${startMonth} ${startDay}, ${year}`;
        endDateStr = `${endMonth} ${endDay}, ${year}`;
      } else {
        const multiMatch = displayDate.match(multiMonthPattern);
        if (multiMatch) {
          const [, startMonth, startDay, startYear, endMonth, endDay, endYear] = multiMatch;
          startDateStr = `${startMonth} ${startDay}, ${startYear}`;
          endDateStr = `${endMonth} ${endDay}, ${endYear}`;
        } else {
          return null;
        }
      }
    }

    const startParsed = parse(startDateStr, "MMM d, yyyy", new Date());
    const startNaive = new Date(
      startParsed.getFullYear(),
      startParsed.getMonth(),
      startParsed.getDate(),
      8,
      0,
      0,
      0,
    );
    const startDate = fromZonedTime(startNaive, timezone);

    const endParsed = parse(endDateStr, "MMM d, yyyy", new Date());
    const endNaive = new Date(
      endParsed.getFullYear(),
      endParsed.getMonth(),
      endParsed.getDate(),
      18,
      0,
      0,
      0,
    );
    const endDate = fromZonedTime(endNaive, timezone);

    return { startDate, endDate };
  } catch {
    return null;
  }
}

export interface UpdateTournamentOptions {
  /** When set (e.g. from initTournament), update this tournament and include start/end date parsing. */
  tournamentId?: string;
}

/**
 * Updates tournament metadata from PGA (including start/end dates from displayDate).
 * When called with no options, updates the current manualActive tournament (cron).
 * When called with tournamentId, updates that tournament (used by initTournament).
 */
export async function updateTournament(options?: UpdateTournamentOptions) {
  try {
    const tournament = options?.tournamentId
      ? await prisma.tournament.findUnique({
          where: { id: options.tournamentId },
        })
      : await prisma.tournament.findFirst({
          where: { manualActive: true },
        });

    if (!tournament) {
      console.error("[CRON] No current tournament found");
      return;
    }

    const tournamentData = await getTournament(tournament.pgaTourId);

    const parsedDates = parseTournamentDates(
      tournamentData.displayDate,
      tournamentData.timezone,
      tournamentData.seasonYear,
    );

    if (parsedDates) {
      console.log(
        `- updateTournament: Parsed dates - Start: ${parsedDates.startDate.toISOString()}, End: ${parsedDates.endDate.toISOString()}`,
      );
    } else {
      console.warn(
        `- updateTournament: Could not parse dates from displayDate: "${tournamentData.displayDate}"`,
      );
    }

    await prisma.tournament.update({
      where: { id: tournament.id },
      data: {
        status: tournamentData.tournamentStatus,
        roundStatusDisplay: tournamentData.roundStatusDisplay,
        roundDisplay: tournamentData.roundDisplay,
        currentRound: tournamentData.currentRound,
        weather: formatWeather(tournamentData.weather) as any,
        beautyImage: tournamentData.beautyImage,
        ...(tournamentData.courses?.[0]?.courseName && {
          course: tournamentData.courses[0].courseName,
        }),
        city: tournamentData.city,
        state: tournamentData.state,
        timezone: tournamentData.timezone,
        ...(parsedDates && {
          startDate: parsedDates.startDate,
          endDate: parsedDates.endDate,
        }),
      },
    });
  } catch (error) {
    console.error("[CRON] Error in updateTournament:", error);
    throw error;
  }
}

// Main execution block
if (import.meta.url === `file://${process.argv[1]}`) {
  updateTournament()
    .then(() => {
      console.log("Tournament update completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Tournament update failed:", error);
      process.exit(1);
    });
}
