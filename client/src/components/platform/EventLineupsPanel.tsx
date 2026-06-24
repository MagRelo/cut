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
import { SignInPrompt } from "../user/SignInPrompt";
import { LineupContestCard } from "../lineup/LineupContestCard";
import { ContestLineupJoinActions } from "../contest/ContestLineupJoinActions";
import { lineupsCopyableIntoContest, lineupsForContestPanel } from "../../lib/lineupContestScope";
import { lineupPickLastNames } from "../../lib/lineupUtils";

function contestLineupForCard(
  row: PlatformLineupListItem,
  user: AuthUser,
  contestId: string,
): ContestLineup {
  const forContest = row.contestLineups.find((entry) => entry.contestId === contestId);
  if (forContest) {
    return {
      ...forContest,
      lineup: row,
      lineupId: row.id,
      user: forContest.user ?? (user as unknown as ContestLineup["user"]),
    };
  }
  return {
    id: row.id,
    contestId: row.contestId ?? contestId,
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
  const {
    lineups,
    lineupError,
    isLoading: isLineupsLoading,
    createLineup,
    cloneLineup,
  } = useLineupData({
    eventId,
  });
  const contestEntry = useContestLineupEntry(contest);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copyingLineupId, setCopyingLineupId] = useState<string | null>(null);

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

  const listItems = useMemo(
    () => lineupsForContestPanel(lineups, contest.id),
    [lineups, contest.id],
  );
  const copyableLineups = useMemo(
    () => lineupsCopyableIntoContest(lineups, contest.id),
    [lineups, contest.id],
  );
  const hasLineups = listItems.length > 0;
  const showCreatePanel = isEventEditable && !isAuthLoading && !isLineupsLoading;
  const isCreateBusy = isCreating || copyingLineupId !== null;

  const handleCreateLineup = async () => {
    if (isCreating) return;
    const nextName = `Lineup #${lineups.length + 1}`;
    setIsCreating(true);
    setCreateError(null);
    try {
      await createLineup(eventId, [], contest.id, nextName);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create lineup");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyFromLineup = async (sourceLineupId: string) => {
    if (copyingLineupId) return;
    const source = copyableLineups.find((row) => row.id === sourceLineupId);
    if (!source) return;

    setCopyingLineupId(sourceLineupId);
    setCreateError(null);
    try {
      const nextName = `Lineup #${lineups.length + 1}`;
      await cloneLineup(sourceLineupId, eventId, contest.id, nextName);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to copy lineup");
    } finally {
      setCopyingLineupId(null);
    }
  };

  const createLineupPanel = showCreatePanel ? (
    <div className="rounded-sm border border-gray-200 bg-gray-50 p-4">
      <p className="font-display text-base font-semibold text-gray-900">Create lineup</p>
      <p className="mt-1 font-display text-sm leading-relaxed text-gray-600">
        {hasLineups ? (
          "Start a new lineup or copy picks from one you entered in another contest."
        ) : (
          <>
            Pick players for <span className="font-medium text-gray-800">{displayEventName}</span>,
            then join this contest.
          </>
        )}
      </p>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => void handleCreateLineup()}
          disabled={isCreateBusy}
          className="inline-flex items-center justify-center gap-1 rounded border border-blue-500 bg-blue-500 px-3 py-2 font-display text-sm text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4 shrink-0" aria-hidden />
          {isCreating ? "Creating…" : "New lineup"}
        </button>
      </div>

      {copyableLineups.length > 0 ? (
        <div className="mt-4">
          <p className="font-display text-xs font-medium uppercase tracking-wide text-gray-500">
            Or copy from another contest
          </p>
          <ul className="mt-2 divide-y divide-gray-200 overflow-hidden rounded border border-gray-200 bg-white">
            {copyableLineups.map((row) => {
              const players = lineupPickLastNames(row);
              const isCopying = copyingLineupId === row.id;
              return (
                <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-medium text-gray-900">{row.name}</p>
                    {players.length > 0 ? (
                      <p className="mt-0.5 font-display text-xs leading-relaxed text-gray-600">
                        {players.join(", ")}
                      </p>
                    ) : (
                      <p className="mt-0.5 font-display text-xs text-gray-500">
                        No players selected
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopyFromLineup(row.id)}
                    disabled={isCreateBusy}
                    className="shrink-0 rounded border border-blue-500 bg-blue-500 px-3 py-1 font-display text-xs text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCopying ? "Copying…" : "Copy"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  ) : null;

  if (!isAuthenticated) {
    return <SignInPrompt action="build lineups" className="py-6" />;
  }

  if ((isAuthLoading && !user) || isLineupsLoading) {
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
            <div
              key={row.id}
              className="overflow-hidden rounded-sm border border-gray-300 shadow-md"
            >
              <LineupContestCard
                lineup={contestLineupForCard(row, user, contest.id)}
                contestId={contest.id}
                isEditable={isEventEditable}
                sportId={sportId}
                eventId={eventId}
                eventStatus={eventStatus}
                eventMetadata={eventMetadata}
                isEventEditable={isEventEditable}
              />
              <ContestLineupJoinActions contest={contest} lineupId={row.id} entry={contestEntry} />
            </div>
          ))}
          {createLineupPanel}
        </div>
      ) : (
        createLineupPanel
      )}

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
