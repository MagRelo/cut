import type { RosterRules } from "@cut/sport-sdk";
import { useSportsQuery } from "./useSportData";

const FALLBACK_ROSTER_RULES: RosterRules = {
  slotCount: 4,
  minPicks: 4,
  maxPicks: 4,
  allowDuplicates: false,
};

/**
 * Roster size for a sport. Returns `undefined` until the sports catalog has
 * loaded so callers do not render golf's 4 slots as a stand-in.
 */
export function useSportRosterRules(sportId: string | undefined): RosterRules | undefined {
  const { data: sports, isPending } = useSportsQuery();
  if (!sportId) return undefined;
  const sport = sports?.find((entry) => entry.id === sportId);
  if (sport?.rosterRules) return sport.rosterRules;
  if (isPending) return undefined;
  return FALLBACK_ROSTER_RULES;
}
