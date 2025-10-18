import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { useTournament } from "../contexts/TournamentContext";
import { usePortoAuth } from "../contexts/PortoAuthContext";
import { useLineup } from "../contexts/LineupContext";
import { useContestsQuery } from "../hooks/useContestQuery";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
// import { Share } from "../components/common/Share";

import { PageHeader } from "../components/common/PageHeader";
import { LineupCard } from "../components/lineup/LineupCard";
import { LineupContestCard } from "../components/lineup/LineupContestCard";
// import { TournamentInfoPanel } from "../components/tournament/TournamentInfoPanel";
import type { ContestLineup } from "../types/lineup";

export const LineupList: React.FC = () => {
  const { loading: isAuthLoading, user } = usePortoAuth();
  const {
    isLoading: isTournamentLoading,
    currentTournament,
    isTournamentEditable,
    tournamentStatusDisplay,
  } = useTournament();
  const { lineups, lineupError, getLineups } = useLineup();

  // Get chain ID and fetch contests with full contestLineups data
  const { chainId: connectedChainId } = useAccount();
  const chainId = connectedChainId ?? baseSepolia.id;
  const { data: contests = [] } = useContestsQuery(currentTournament?.id, chainId);

  // Extract user's contest lineups from all contests
  const userContestLineups = useMemo(() => {
    if (!user?.id) return [];

    const contestLineups: ContestLineup[] = [];
    contests.forEach((contest) => {
      contest.contestLineups?.forEach((contestLineup) => {
        if (contestLineup.userId === user.id) {
          contestLineups.push(contestLineup);
        }
      });
    });

    return contestLineups;
  }, [contests, user?.id]);

  // Function to get contests for a specific lineup
  const getContestsForLineup = (lineupId: string) => {
    return contests
      .filter((contest) =>
        contest.contestLineups?.some((lineup) => lineup.tournamentLineupId === lineupId)
      )
      .map((contest) => {
        const lineupEntry = contest.contestLineups?.find(
          (lineup) => lineup.tournamentLineupId === lineupId
        );
        return {
          contest: contest,
          position: lineupEntry?.position || 0,
        };
      });
  };

  useEffect(() => {
    const fetchLineups = async () => {
      if (!currentTournament?.id) return;

      // Only fetch if we don't have lineups for this tournament
      if (lineups.length === 0) {
        try {
          await getLineups(currentTournament.id);
        } catch (error) {
          console.error("Failed to fetch lineups:", error);
        }
      }
    };

    fetchLineups();
  }, [currentTournament?.id, getLineups, lineups.length]);

  if (isAuthLoading || isTournamentLoading) {
    return (
      <div className="px-4 py-4">
        <LoadingSpinner />
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

  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Lineups" />

      {/* Tournament Info Panel - only show when editable */}
      {/* {isTournamentEditable && <TournamentInfoPanel />} */}

      {/* list of user lineups */}
      {isTournamentEditable
        ? // When editable, show TournamentLineup cards
          lineups &&
          lineups.length > 0 && (
            <div>
              {lineups.map((lineup) => (
                <div
                  key={lineup.id}
                  className="rounded-md border border-gray-200 bg-white p-4 pb-6 mt-4"
                >
                  <LineupCard lineup={lineup} isEditable={isTournamentEditable} />
                </div>
              ))}
            </div>
          )
        : // When not editable, show ContestLineup cards
          userContestLineups &&
          userContestLineups.length > 0 && (
            <div>
              {userContestLineups.map((contestLineup) => (
                <div
                  key={contestLineup.id}
                  className="rounded-sm border border-gray-200 bg-white p-4 pb-6 mt-4"
                >
                  <LineupContestCard
                    lineup={contestLineup}
                    roundDisplay={currentTournament?.roundDisplay || ""}
                    contests={getContestsForLineup(contestLineup.tournamentLineupId)}
                  />
                </div>
              ))}
            </div>
          )}

      {/* not editable warning */}
      {!isTournamentEditable && userContestLineups && userContestLineups.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-sm shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-600 text-lg">⚠️</span>
            <div className="text-lg font-semibold text-gray-800 font-display">
              Tournament {tournamentStatusDisplay}
            </div>
          </div>
          <div className="text-sm text-gray-700">
            <p className="mb-2">Lineups cannot be edited.</p>
          </div>
        </div>
      )}

      {/* Create/Add Lineup Button */}
      {isTournamentEditable && (
        <div className="text-center">
          <Link
            to="/lineups/create"
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold font-display rounded block text-center uppercase"
          >
            + Add Lineup
          </Link>
        </div>
      )}

      {/* Share Section */}
      {/* <div className="flex justify-center my-8">
        <Share url={window.location.href} title="Share the Cut" subtitle="" />
      </div> */}
    </div>
  );
};
