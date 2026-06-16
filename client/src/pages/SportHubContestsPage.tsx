import React, { useMemo } from "react";
import { ContestList } from "../components/contest/ContestList";
import { PageHeader } from "../components/common/PageHeader";
import { useActiveEvent } from "../hooks/useActiveEvent";
import { useContestsQuery } from "../hooks/useContestQuery";

/** Contests for the active event of the sport in the URL (`/sports/:sportId`). */
export const SportHubContests: React.FC = () => {
  const { eventId, isLoading: isEventLoading, error: fetchError } = useActiveEvent();

  const {
    data: contestsWithLineupsData,
    isLoading: isContestsLoading,
    error: contestsError,
  } = useContestsQuery(eventId, undefined);
  const eventError = fetchError instanceof Error ? fetchError.message : null;
  const contestsErrorMessage = contestsError instanceof Error ? contestsError.message : null;
  const error = eventError ?? contestsErrorMessage;

  const contests = useMemo(() => {
    const list = contestsWithLineupsData ?? [];
    return [...list].sort((a, b) => {
      const feeA = a.settings?.primaryDeposit ?? 0;
      const feeB = b.settings?.primaryDeposit ?? 0;
      return feeB - feeA;
    });
  }, [contestsWithLineupsData]);

  const showLoading =
    isEventLoading || (isContestsLoading && contestsWithLineupsData === undefined);

  return (
    <div className="mb-4 space-y-4">
      <PageHeader title="Live Contests" />
      <ContestList
        contests={contests}
        loading={showLoading}
        error={error}
        showPrivateLeagueNotice
      />
    </div>
  );
};
