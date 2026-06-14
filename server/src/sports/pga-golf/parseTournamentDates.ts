import { fromZonedTime } from "date-fns-tz";
import { parse } from "date-fns";

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
