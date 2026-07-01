import { COMMODITIES_ROUND_COUNT } from "@cut/sport-commodities";

export function commoditiesPeriodDisplay(currentPeriod: number): string {
  return `D${Math.min(COMMODITIES_ROUND_COUNT, Math.max(1, currentPeriod))}`;
}

export function commoditiesPeriodStatusDisplay(
  currentPeriod: number,
  isComplete: boolean,
): string {
  if (isComplete) {
    return "Week complete";
  }
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const index = Math.min(COMMODITIES_ROUND_COUNT, Math.max(1, currentPeriod)) - 1;
  return `${dayNames[index]} session`;
}
