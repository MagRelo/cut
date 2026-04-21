import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLineupData } from "../hooks/useLineupData";
import { useActiveTournament } from "../hooks/useTournamentData";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";

import { PageHeader } from "../components/common/PageHeader";
import { LineupCard } from "../components/lineup/LineupCard";
import { LineupContestCard } from "../components/lineup/LineupContestCard";
import type { AuthUser } from "../contexts/AuthContext";
import type { ContestLineup, TournamentLineupListItem } from "../types/lineup";

function contestLineupForCard(row: TournamentLineupListItem, user: AuthUser): ContestLineup {
  const tournamentLineup = {
    id: row.id,
    name: row.name,
    players: row.players,
  };
  const first = row.contestLineups[0];
  if (first) {
    return {
      ...first,
      tournamentLineup,
      user: first.user ?? (user as unknown as ContestLineup["user"]),
    };
  }
  return {
    id: row.id,
    contestId: "",
    userId: user.id,
    tournamentLineupId: row.id,
    position: 0,
    score: 0,
    status: "ACTIVE",
    tournamentLineup,
    user: user as unknown as ContestLineup["user"],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function contestsForCard(row: TournamentLineupListItem) {
  return row.contestLineups.map((cl) => ({
    contest: cl.contest,
    position: cl.position ?? 0,
  }));
}

export const LineupList: React.FC = () => {
  const { loading: isAuthLoading, user } = useAuth();
  const {
    isLoading: isTournamentLoading,
    currentTournament,
    isTournamentEditable,
    tournamentStatusDisplay,
  } = useActiveTournament();
  const { lineups, lineupError, isLoading: isLineupsLoading } = useLineupData();

  const listItems = lineups as TournamentLineupListItem[];
  const hasLineups = listItems.length > 0;
  const tournamentName = currentTournament?.name ?? "this tournament";

  const showAddLineup =
    isTournamentEditable && !isAuthLoading && !isTournamentLoading && !isLineupsLoading;

  const header = (
    <PageHeader
      title="My Lineups"
      actions={
        showAddLineup ? (
          <Link
            to="/lineups/create"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded border border-blue-500 transition-colors text-sm font-display"
          >
            Add Lineup
          </Link>
        ) : null
      }
    />
  );

  if (isAuthLoading || isTournamentLoading || isLineupsLoading) {
    return (
      <div className="p-4 space-y-4">
        {header}
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (lineupError) {
    return (
      <div className="p-4 space-y-4">
        {header}
        <ErrorMessage message={lineupError} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 space-y-4">
        {header}
        <ErrorMessage message="Sign in to view lineups." />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {header}

      {isTournamentEditable && hasLineups && (
        <div>
          {listItems.map((lineup) => (
            <div
              key={lineup.id}
              className="rounded-md border border-gray-200 bg-white p-4 pb-6 mt-4"
            >
              <LineupCard lineup={lineup} isEditable={isTournamentEditable} />
            </div>
          ))}
        </div>
      )}

      {isTournamentEditable && !hasLineups && (
        <div className="bg-white border border-gray-200 rounded-sm shadow p-4">
          <p className="text-base font-semibold text-gray-900 font-display mb-1">
            Build your first lineup
          </p>
          <p className="text-sm text-gray-600 font-display leading-relaxed">
            Choose your players for{" "}
            <span className="font-medium text-gray-800">{tournamentName}</span>.
          </p>
          {showAddLineup ? (
            <Link
              to="/lineups/create"
              className="mt-3 inline-block rounded border border-blue-500 bg-blue-500 px-3 py-1 text-xs font-display text-white transition-colors hover:bg-blue-600"
            >
              Add Lineup
            </Link>
          ) : null}
        </div>
      )}

      {!isTournamentEditable && hasLineups && (
        <div>
          {listItems.map((row) => (
            <div key={row.id} className="rounded-sm border border-gray-200 bg-white p-4 pb-6">
              <LineupContestCard
                lineup={contestLineupForCard(row, user)}
                roundDisplay={currentTournament?.roundDisplay || ""}
                contests={contestsForCard(row)}
              />
            </div>
          ))}
        </div>
      )}

      {!isTournamentEditable && !hasLineups && (
        <div className="bg-white border border-gray-200 rounded-sm shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-600 text-lg">🏌️</span>
            <div className="text-lg font-semibold text-gray-900 font-display">
              Tournament {tournamentStatusDisplay}!
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p className="mb-2">Check back when the next tournament opens to create your lineup.</p>
          </div>
        </div>
      )}
    </div>
  );
};
