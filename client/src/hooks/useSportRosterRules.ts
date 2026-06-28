import type { RosterRules } from "@cut/sport-sdk";
import { useSportsQuery } from "./useSportData";

const DEFAULT_SLOT_COUNT = 4;

export function useSportRosterRules(sportId: string | undefined): RosterRules {
  const { data: sports = [] } = useSportsQuery();
  const sport = sports.find((entry) => entry.id === sportId);
  return (
    sport?.rosterRules ?? {
      slotCount: DEFAULT_SLOT_COUNT,
      minPicks: DEFAULT_SLOT_COUNT,
      maxPicks: DEFAULT_SLOT_COUNT,
      allowDuplicates: false,
    }
  );
}
