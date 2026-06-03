import React, { useMemo } from "react";
import { ContestList } from "../components/contest/ContestList";
import { PageHeader } from "../components/common/PageHeader";
import { useActiveTournament } from "../hooks/useTournamentData";
import { useContestsQuery } from "../hooks/useContestQuery";

export const Contests: React.FC = () => {
  const { tournament, isLoading: isTournamentLoading, error: fetchError } = useActiveTournament();
  const tournamentId = tournament?.id;

  const {
    data: contestsWithLineupsData,
    isLoading: isContestsLoading,
    error: contestsError,
  } = useContestsQuery(tournamentId, undefined);
  const tournamentError = fetchError instanceof Error ? fetchError.message : null;
  const contestsErrorMessage = contestsError instanceof Error ? contestsError.message : null;
  const error = tournamentError ?? contestsErrorMessage;

  // Sort contests by entry fee (highest first)
  const contests = useMemo(() => {
    const list = contestsWithLineupsData ?? [];
    return [...list].sort((a, b) => {
      const feeA = a.settings?.primaryDeposit ?? 0;
      const feeB = b.settings?.primaryDeposit ?? 0;
      return feeB - feeA;
    });
  }, [contestsWithLineupsData]);

  const showLoading =
    isTournamentLoading || (isContestsLoading && contestsWithLineupsData === undefined);

  return (
    <div className="mb-4 space-y-4">
      <PageHeader title="Live Contests" />
      <ContestList contests={contests} loading={showLoading} error={error} />
    </div>
  );
};
