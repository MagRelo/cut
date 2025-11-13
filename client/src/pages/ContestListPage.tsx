import React, { useMemo } from "react";
import { useAccount } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { PageHeader } from "../components/common/PageHeader";
import { ContestList } from "../components/contest/ContestList";
import { useCurrentTournament } from "../hooks/useTournamentData";
import { useContestsQuery } from "../hooks/useContestQuery";

export const Contests: React.FC = () => {
  const { chainId: connectedChainId } = useAccount();
  const chainId = connectedChainId ?? baseSepolia.id;

  const { tournament, isLoading: isTournamentLoading, error: fetchError } = useCurrentTournament();
  const tournamentId = tournament?.id;

  // Fetch contests with full lineup data to determine user participation
  const {
    data: contestsWithLineupsData,
    isLoading: isContestsLoading,
    error: contestsError,
  } = useContestsQuery(tournamentId, chainId);
  const tournamentError = fetchError instanceof Error ? fetchError.message : null;
  const contestsErrorMessage = contestsError instanceof Error ? contestsError.message : null;
  const error = tournamentError ?? contestsErrorMessage;

  // Sort contests by entry fee (highest first)
  const contests = useMemo(() => {
    const list = contestsWithLineupsData ?? [];
    return [...list].sort((a, b) => {
      const feeA = a.settings?.fee ?? 0;
      const feeB = b.settings?.fee ?? 0;
      return feeB - feeA;
    });
  }, [contestsWithLineupsData]);

  const showLoading =
    isTournamentLoading || (isContestsLoading && contestsWithLineupsData === undefined);

  return (
    <div className="space-y-4 p-4">
      <PageHeader title="Contests" className="" />
      <div className="bg-white rounded-sm shadow p-2">
        <ContestList contests={contests} loading={showLoading} error={error} />
      </div>
    </div>
  );
};
