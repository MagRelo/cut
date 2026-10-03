import { getISOWeek, getISOWeekYear } from "date-fns";
import { isGolfEventCompleteRaw } from "@cut/sport-pga-golf";

export type GolfEventPickInput = {
  id: string;
  tournamentName: string;
  status: string;
  startDate: Date | null;
  fieldSize: number;
};

export type NextGolfEventPick = {
  id: string;
  tournamentName: string;
  status: string;
  startDate: Date;
  fieldSize: number;
};

function startWeekKey(date: Date): string {
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, "0")}`;
}

/**
 * Soonest upcoming PGA event with a published field, excluding the current active id.
 * Same ISO start week → larger field wins.
 */
export function pickNextGolfEvent(
  candidates: GolfEventPickInput[],
  currentExternalId: string | null = null,
): NextGolfEventPick | null {
  const eligible: NextGolfEventPick[] = [];
  for (const candidate of candidates) {
    if (isGolfEventCompleteRaw(candidate.status)) continue;
    if (!candidate.startDate) continue;
    if (candidate.fieldSize <= 0) continue;
    if (currentExternalId && candidate.id === currentExternalId) continue;
    eligible.push({
      id: candidate.id,
      tournamentName: candidate.tournamentName,
      status: candidate.status,
      startDate: candidate.startDate,
      fieldSize: candidate.fieldSize,
    });
  }
  if (eligible.length === 0) return null;

  let soonest = eligible[0]!;
  for (const candidate of eligible) {
    if (candidate.startDate.getTime() < soonest.startDate.getTime()) {
      soonest = candidate;
    }
  }
  const week = startWeekKey(soonest.startDate);
  const sameWeek = eligible.filter((candidate) => startWeekKey(candidate.startDate) === week);
  sameWeek.sort((a, b) => {
    if (b.fieldSize !== a.fieldSize) return b.fieldSize - a.fieldSize;
    return a.startDate.getTime() - b.startDate.getTime();
  });
  return sameWeek[0] ?? null;
}
