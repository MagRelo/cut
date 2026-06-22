import React, { useMemo, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import type { Contest } from "../../types/contest";
import type { AuthUser } from "../../contexts/AuthContext";
import type { ContestLineup, PlatformLineupListItem } from "../../types/lineup";
import { useAuth } from "../../contexts/AuthContext";
import { useLineupData } from "../../hooks/useLineupData";
import { useContestLineupEntry } from "../../hooks/useContestLineupEntry";
import {
  eventDisplayNameFromMetadata,
  eventStatusDisplayFromMetadata,
  eventStatusFromMetadata,
  isEventEditableFromMetadata,
} from "../../lib/eventMetadata";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { PageSection } from "../layout/PageSection";
import { ErrorMessage } from "../common/ErrorMessage";
import { Connect } from "../user/Connect";
import { LineupContestCard } from "../lineup/LineupContestCard";
import { ContestLineupJoinActions } from "../contest/ContestLineupJoinActions";

function contestLineupForCard(
  row: PlatformLineupListItem,
  user: AuthUser,
): ContestLineup {
  const first = row.contestLineups[0];
  if (first) {
    return {
      ...first,
      lineup: row,
      lineupId: row.id,
      user: first.user ?? (user as unknown as ContestLineup["user"]),
    };
  }
  return {
    id: row.id,
    contestId: "",
    userId: user.id,
    lineupId: row.id,
    position: 0,
    score: row.score,
    status: "ACTIVE",
    lineup: row,
    user: user as unknown as ContestLineup["user"],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export interface EventLineupsPanelProps {
  contest: Contest;
  sportId: string;
  eventId: string;
  eventMetadata?: unknown;
  isAuthenticated: boolean;
}

export const EventLineupsPanel: React.FC<EventLineupsPanelProps> = ({
  contest,
  sportId,
  eventId,
  eventMetadata,
  isAuthenticated,
}) => {
  const { loading: isAuthLoading, user } = useAuth();
  const { lineups, lineupError, isLoading: isLineupsLoading, createLineup } = useLineupData({
    eventId,
  });
  const contestEntry = useContestLineupEntry(contest);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const eventStatus = useMemo(() => eventStatusFromMetadata(eventMetadata), [eventMetadata]);
  const isEventEditable = useMemo(
    () => isEventEditableFromMetadata(eventMetadata),
    [eventMetadata],
  );
  const displayEventName = useMemo(
    () => eventDisplayNameFromMetadata(eventMetadata),
    [eventMetadata],
  );
  const eventStatusDisplay = useMemo(
    () => eventStatusDisplayFromMetadata(eventMetadata),
    [eventMetadata],
  );

  const listItems = lineups;
  const hasLineups = listItems.length > 0;
  const showAddLineup = isEventEditable && !isAuthLoading && !isLineupsLoading;

  const handleCreateLineup = async () => {
    if (isCreating) return;
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

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
        <p className="font-display text-sm text-gray-600">
          <b>Sign in</b> to build and manage lineups for this event.
        </p>
        <Connect />
      </div>
    );
  }

  if (isAuthLoading || isLineupsLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (lineupError) {
    return <ErrorMessage message={lineupError} />;
  }

  if (!user) {
    return <ErrorMessage message="Sign in to view lineups." />;
  }

  const entryError =
    contestEntry.validationError ||
    contestEntry.submissionError ||
    contestEntry.serverError ||
    contestEntry.transactionError;

  return (
    <div className="space-y-4">
      {createError ? <ErrorMessage message={createError} /> : null}
      {entryError && !hasLineups ? (
        <div className="rounded border border-red-400 bg-red-100 p-3 text-sm text-red-700">
          {entryError}
        </div>
      ) : null}

      {hasLineups ? (
        <div className="space-y-4">
          {listItems.map((row) => (
            <div key={row.id} className="overflow-hidden rounded-sm border border-gray-300 shadow-md">
              <LineupContestCard
                lineup={contestLineupForCard(row, user)}
                isEditable={isEventEditable}
                sportId={sportId}
                eventId={eventId}
                eventStatus={eventStatus}
                eventMetadata={eventMetadata}
                isEventEditable={isEventEditable}
              />
              <ContestLineupJoinActions
                contest={contest}
                lineupId={row.id}
                entry={contestEntry}
              />
            </div>
          ))}

          {showAddLineup ? (
            <div>
              <div className="py-6">
                <hr className="border-0 border-t border-gray-200" />
              </div>
              <p className="text-center font-display text-sm text-gray-600">
                Did you know you can have more lineups?
              </p>
              <div className="mt-3 flex justify-center pb-2">
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
            </div>
          ) : null}
        </div>
      ) : null}

      {isEventEditable && !hasLineups ? (
        <PageSection>
          <p className="mb-1 font-display text-base font-semibold text-gray-900">
            Build your first lineup
          </p>
          <p className="font-display text-sm leading-relaxed text-gray-600">
            Choose your players for{" "}
            <span className="font-medium text-gray-800">{displayEventName}</span>, then join this
            contest.
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
      ) : null}

      {!isEventEditable && !hasLineups ? (
        <PageSection>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg text-gray-600">🏌️</span>
            <div className="font-display text-lg font-semibold text-gray-900">
              Event {eventStatusDisplay}!
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Check back when the next event opens to create your lineup.
          </p>
          <Link
            to="/contests"
            className="mt-3 inline-block rounded border border-blue-500 bg-blue-500 px-3 py-1 font-display text-sm text-white transition-colors hover:bg-blue-600"
          >
            Browse Contests
          </Link>
        </PageSection>
      ) : null}
    </div>
  );
};
