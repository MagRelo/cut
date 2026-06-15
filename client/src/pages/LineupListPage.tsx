import React, { useMemo, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { useLineupData } from "../hooks/useLineupData";
import { useActiveEvent } from "../hooks/useActiveEvent";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { PageSection } from "../components/layout/PageSection";
import { ErrorMessage } from "../components/common/ErrorMessage";

import { PageHeader } from "../components/common/PageHeader";
import { LineupContestCard } from "../components/lineup/LineupContestCard";
import type { AuthUser } from "../contexts/AuthContext";
import type { ContestLineup, PlatformLineupListItem } from "../types/lineup";
import { enrichLineupListItem } from "../lib/lineupUtils";

function contestLineupForCard(
  row: ReturnType<typeof enrichLineupListItem>,
  user: AuthUser,
): ContestLineup {
  const tournamentLineup = {
    id: row.id,
    name: row.name,
    players: row.players,
    winningScorePrediction: row.winningScorePrediction,
  };
  const first = row.contestLineups[0];
  if (first) {
    return {
      ...first,
      tournamentLineup,
      lineup: tournamentLineup,
      user: first.user ?? (user as unknown as ContestLineup["user"]),
    };
  }
  return {
    id: row.id,
    contestId: "",
    userId: user.id,
    tournamentLineupId: row.id,
    lineupId: row.id,
    position: 0,
    score: 0,
    status: "ACTIVE",
    tournamentLineup,
    lineup: tournamentLineup,
    user: user as unknown as ContestLineup["user"],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function contestsForCard(row: PlatformLineupListItem) {
  return row.contestLineups.map((cl) => ({
    contest: cl.contest,
    position: cl.position ?? 0,
  }));
}

export const LineupList: React.FC = () => {
  const { loading: isAuthLoading, user } = useAuth();
  const {
    isLoading: isEventLoading,
    eventId,
    eventName,
    isEventEditable,
    eventStatusDisplay,
    candidates,
    roundDisplay,
  } = useActiveEvent();
  const { lineups, lineupError, isLoading: isLineupsLoading, createLineup } = useLineupData();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const listItems = useMemo(() => {
    if (!eventId) return [];
    return lineups.map((row) => enrichLineupListItem(row, eventId, candidates));
  }, [lineups, eventId, candidates]);

  const hasLineups = listItems.length > 0;
  const displayEventName = eventName ?? "this event";

  const showAddLineup =
    isEventEditable && !isAuthLoading && !isEventLoading && !isLineupsLoading;

  const handleCreateLineup = async () => {
    if (!eventId || isCreating) return;
    const nextName = `Lineup #${listItems.length + 1}`;
    setIsCreating(true);
    setCreateError(null);
    try {
      await createLineup(eventId, [], nextName);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create lineup");
    } finally {
      setIsCreating(false);
    }
  };

  const header = <PageHeader title="My Lineups" />;

  const addLineupButton =
    showAddLineup && hasLineups ? (
      <div className="mb-6 mt-8 flex justify-center">
        <button
          type="button"
          onClick={() => void handleCreateLineup()}
          disabled={isCreating}
          className="inline-flex items-center justify-center gap-1 rounded border border-blue-500 bg-blue-500 px-3 py-2 font-display text-sm text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4 shrink-0" aria-hidden />
          {isCreating ? "Adding..." : "Add New Lineup"}
        </button>
      </div>
    ) : null;

  if (isAuthLoading || isEventLoading || isLineupsLoading) {
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
            <div key={row.id} className="mb-4 rounded-sm border border-gray-300 shadow-md">
              <LineupContestCard
                lineup={contestLineupForCard(row, user)}
                roundDisplay={roundDisplay || "R1"}
                contests={contestsForCard(row)}
                isEditable={isEventEditable}
              />
            </div>
          ))}

          <hr className="mt-8" />

          {addLineupButton}
        </div>
      )}

      {isEventEditable && !hasLineups && (
        <PageSection>
          <p className="mb-1 font-display text-base font-semibold text-gray-900">
            Build your first lineup
          </p>
          <p className="font-display text-sm leading-relaxed text-gray-600">
            Choose your players for{" "}
            <span className="font-medium text-gray-800">{displayEventName}</span>.
          </p>
          {showAddLineup ? (
            <button
              type="button"
              onClick={() => void handleCreateLineup()}
              disabled={isCreating}
              className="mt-3 inline-block rounded border border-blue-500 bg-blue-500 px-3 py-1 font-display text-xs text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Build Lineup"}
            </button>
          ) : null}
        </PageSection>
      )}

      {!isEventEditable && !hasLineups && (
        <PageSection>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg text-gray-600">🏌️</span>
            <div className="font-display text-lg font-semibold text-gray-900">
              Event {eventStatusDisplay}!
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p className="mb-2">Check back when the next event opens to create your lineup.</p>
          </div>
        </PageSection>
      )}
    </div>
  );
};
