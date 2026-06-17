import { useCallback, useMemo } from "react";
import type { Candidate, CandidateSortContext, EventStatus } from "@cut/sport-sdk";
import { sortCandidates } from "@cut/sport-sdk";
import { useRequiredSportUIPlugin } from "./useSportUI";

export function useCandidateSort(sportId?: string) {
  const plugin = useRequiredSportUIPlugin(sportId);
  const config = plugin.candidateSortConfig;

  const sort = useCallback(
    (candidates: Candidate[], context: CandidateSortContext, eventStatus?: EventStatus) =>
      sortCandidates(candidates, config, context, { eventStatus }),
    [config],
  );

  return useMemo(() => ({ sort, config }), [sort, config]);
}
