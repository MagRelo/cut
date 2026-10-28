import type { RosterRules } from "@cut/sport-sdk";
import { useSportsQuery } from "./useSportData";

/** Roster size for a sport. Undefined until the catalog returns rules for that id. */
export function useSportRosterRules(sportId: string | undefined): RosterRules | undefined {
  const { data: sports } = useSportsQuery();
  if (!sportId) return undefined;
  return sports?.find((entry) => entry.id === sportId)?.rosterRules;
}
