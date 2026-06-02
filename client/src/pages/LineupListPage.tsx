import React, { useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { useLineupData } from "../hooks/useLineupData";
import { useActiveTournament } from "../hooks/useTournamentData";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { PageSection } from "../components/layout/PageSection";
import { ErrorMessage } from "../components/common/ErrorMessage";

import { PageHeader } from "../components/common/PageHeader";
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
    tournament,
    isTournamentEditable,
    tournamentStatusDisplay,
  } = useActiveTournament();
  const { lineups, lineupError, isLoading: isLineupsLoading, createLineup } = useLineupData();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const listItems = lineups as TournamentLineupListItem[];
  const hasLineups = listItems.length > 0;
  const tournamentName = tournament?.name ?? "this tournament";

  const showAddLineup =
    isTournamentEditable && !isAuthLoading && !isTournamentLoading && !isLineupsLoading;

  const handleCreateLineup = async () => {
    if (!tournament?.id || isCreating) return;
    const nextName = `Lineup #${listItems.length + 1}`;
    setIsCreating(true);
    setCreateError(null);
    try {
      await createLineup(tournament.id, [], nextName);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create lineup");
    } finally {
      setIsCreating(false);
    }
  };

  const header = <PageHeader title="My Lineups" />;

  const addLineupButton =
    showAddLineup && hasLineups ? (
      <div className="mt-2 flex justify-center">
        <button
          type="button"
          onClick={() => void handleCreateLineup()}
          disabled={isCreating}
          className="inline-flex items-center justify-center gap-2 rounded border border-blue-500 bg-blue-500 px-3 py-2 text-sm font-display text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4 shrink-0" aria-hidden />
          {isCreating ? "Adding..." : "Add Lineup"}
        </button>
      </div>
    ) : null;

  if (isAuthLoading || isTournamentLoading || isLineupsLoading) {
    return (
      <div className="space-y-4">
        {header}
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (lineupError) {
    return (
      <div className="space-y-4">
        {header}
        <ErrorMessage message={lineupError} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        {header}
        <ErrorMessage message="Sign in to view lineups." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}

      {createError ? <ErrorMessage message={createError} /> : null}

      {hasLineups && (
        <div>
          {listItems.map((row) => (
            <div key={row.id} className="rounded-sm border border-gray-200 mb-4">
              <LineupContestCard
                lineup={contestLineupForCard(row, user)}
                roundDisplay={tournament?.roundDisplay || ""}
                contests={contestsForCard(row)}
                isEditable={isTournamentEditable}
              />
            </div>
          ))}
          {addLineupButton}
        </div>
      )}

      {isTournamentEditable && !hasLineups && (
        <PageSection>
          <p className="text-base font-semibold text-gray-900 font-display mb-1">
            Build your first lineup
          </p>
          <p className="text-sm text-gray-600 font-display leading-relaxed">
            Choose your players for{" "}
            <span className="font-medium text-gray-800">{tournamentName}</span>.
          </p>
          {showAddLineup ? (
            <button
              type="button"
              onClick={() => void handleCreateLineup()}
              disabled={isCreating}
              className="mt-3 inline-block rounded border border-blue-500 bg-blue-500 px-3 py-1 text-xs font-display text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Build Lineup"}
            </button>
          ) : null}
        </PageSection>
      )}

      {!isTournamentEditable && !hasLineups && (
        <PageSection>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-600 text-lg">🏌️</span>
            <div className="text-lg font-semibold text-gray-900 font-display">
              Tournament {tournamentStatusDisplay}!
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p className="mb-2">Check back when the next tournament opens to create your lineup.</p>
          </div>
        </PageSection>
      )}
    </div>
  );
};
