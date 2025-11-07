import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { usePortoAuth } from "../contexts/PortoAuthContext";
import { useLineupData } from "../hooks/useLineupData";
import { useContestsQuery } from "../hooks/useContestQuery";
import { useActiveTournament } from "../hooks/useTournamentData";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
// import { Share } from "../components/common/Share";

import { PageHeader } from "../components/common/PageHeader";
import { LineupCard } from "../components/lineup/LineupCard";
import { LineupContestCard } from "../components/lineup/LineupContestCard";
import type { ContestLineup } from "../types/lineup";

export const LineupList: React.FC = () => {
  const { loading: isAuthLoading, user } = usePortoAuth();
  const {
    isLoading: isTournamentLoading,
    currentTournament,
    isTournamentEditable,
    tournamentStatusDisplay,
  } = useActiveTournament();
  const { lineups, lineupError, getLineups } = useLineupData();

  // Get chain ID and fetch contests with full contestLineups data
  const { chainId: connectedChainId } = useAccount();
  const chainId = connectedChainId ?? baseSepolia.id;
  const { data: contests = [], isLoading: isContestsLoading } = useContestsQuery(
    currentTournament?.id,
    chainId
  );

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

  // Get unique lineups (deduplicated by tournamentLineupId)
  const uniqueUserLineups = useMemo(() => {
    if (!userContestLineups.length) return [];

    // Use a Map to deduplicate by tournamentLineupId
    const lineupMap = new Map<string, ContestLineup>();
    userContestLineups.forEach((contestLineup) => {
      if (!lineupMap.has(contestLineup.tournamentLineupId)) {
        lineupMap.set(contestLineup.tournamentLineupId, contestLineup);
      }
    });

    return Array.from(lineupMap.values());
  }, [userContestLineups]);

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
        : // When not editable, show unique ContestLineup cards (deduplicated by tournamentLineupId)
          uniqueUserLineups &&
          uniqueUserLineups.length > 0 && (
            <div>
              {uniqueUserLineups.map((contestLineup) => (
                <div
                  key={contestLineup.tournamentLineupId}
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

      {/* tournament in progress message */}
      {!isTournamentEditable &&
        !isContestsLoading &&
        uniqueUserLineups &&
        uniqueUserLineups.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-sm shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-600 text-lg">🏌️</span>
              <div className="text-lg font-semibold text-gray-900 font-display">
                Tournament {tournamentStatusDisplay}!
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p className="mb-2">
                Check back when the next tournament opens to create your lineup.
              </p>
            </div>
          </div>
        )}

      {/* Create/Add Lineup Button */}
      {isTournamentEditable && (
        <div className="text-center pt-4">
          <Link
            to="/lineups/create"
            className="inline-block min-w-[120px] bg-blue-500 hover:bg-blue-600 text-white font-display py-2 px-4 rounded border border-blue-500 transition-colors"
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
