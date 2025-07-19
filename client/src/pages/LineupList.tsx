import React, { useState, useEffect } from "react";
import { useTournament } from "../contexts/TournamentContext";
import { usePortoAuth } from "../contexts/PortoAuthContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/util/ErrorMessage";
import { Share } from "../components/common/Share";

import { PageHeader } from "../components/util/PageHeader";
// import { PlayerDisplayCard } from "../components/player/PlayerDisplayCard";
import { useLineupApi } from "../services/lineupApi";
import type { LineupResponse } from "../services/lineupApi";
import { TournamentLineup } from "src/types.new/player";

export const LineupList: React.FC = () => {
  const { loading: isAuthLoading } = usePortoAuth();
  const {
    isLoading: isTournamentLoading,
    error: tournamentError,
    currentTournament,
  } = useTournament();

  // get all lineups for the user using the lineupApi
  const { getLineup } = useLineupApi();
  const [lineupData, setLineupData] = useState<LineupResponse | null>(null);
  const [isLineupLoading, setIsLineupLoading] = useState(false);
  const [lineupError, setLineupError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLineups = async () => {
      if (!currentTournament?.id) return;

      setIsLineupLoading(true);
      setLineupError(null);

      try {
        const response = await getLineup(currentTournament.id);
        setLineupData(response);
      } catch (error) {
        setLineupError(error instanceof Error ? error.message : "Failed to fetch lineups");
      } finally {
        setIsLineupLoading(false);
      }
    };

    fetchLineups();
  }, [currentTournament?.id, getLineup]);

  if (isAuthLoading || isTournamentLoading || isLineupLoading) {
    return (
      <div className="px-4 py-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (tournamentError) {
    return (
      <div className="px-4 py-4">
        <ErrorMessage message={tournamentError.message || "An error occurred"} />
      </div>
    );
  }

  if (lineupError) {
    return (
      <div className="px-4 py-4">
        <ErrorMessage message={lineupError} />
      </div>
    );
  }

  console.log(lineupData);

  return (
    <div className="p-4">
      <PageHeader title="Manage Lineups" className="mb-3" />

      {/* list of user lineups */}
      {lineupData && lineupData.lineups.length > 0 ? (
        lineupData.lineups.map((lineup: TournamentLineup) => (
          <div key={lineup.id}>
            <h2>Lineup ID: {lineup.id}</h2>
            <p>Players: {lineup.players?.length || 0}</p>
          </div>
        ))
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No lineups found for this tournament.</p>
        </div>
      )}

      {/* Share Section */}
      <div className="flex justify-center my-8">
        <Share url={window.location.href} title="Share the Cut" subtitle="" />
      </div>
    </div>
  );
};
