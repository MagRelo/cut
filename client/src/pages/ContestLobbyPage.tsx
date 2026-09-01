import React, { useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { ContestLobbyView } from "../components/contest/lobby/ContestLobbyView";
import { ContestLobbyLoadingShell } from "../components/contest/lobby/ContestLobbyLoadingShell";
import { ContestListConnectHint } from "../components/contest/ContestList";
import { useContestQuery } from "../hooks/useContestQuery";
import { useContestTimelineQuery } from "../hooks/useContestTimelineQuery";
import { useContestLobbyState } from "../hooks/useContestLobbyState";
import { isApiError } from "../utils/apiError";
import {
  getDirectoryContextForContest,
  parseContestLobbyNavigationState,
} from "../lib/contestNavigation";

function ContestNotFound({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-md border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100"
          aria-hidden
        >
          <MagnifyingGlassIcon className="h-6 w-6 text-slate-500" />
        </div>
        <h1 className="font-display text-xl font-semibold text-gray-900">Contest not found</h1>
        {isAuthenticated ? (
          <p className="mt-2 font-display text-sm leading-relaxed text-gray-600">
            Check the link and try again, or browse{" "}
            <Link to="/contests" className="font-semibold text-blue-600 hover:text-blue-700">
              live contests
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="mt-2 font-display text-sm leading-relaxed text-gray-600">
              This contest may be private, or the link may be incorrect.
            </p>
            <div className="mt-5 border-t border-slate-100 pt-5">
              <ContestListConnectHint className="text-center" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export const ContestLobby: React.FC = () => {
  const { address: contestAddress } = useParams<{ address: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: contest,
    isLoading,
    isFetching,
    isPlaceholderData,
    error: queryError,
  } = useContestQuery(contestAddress);
  const {
    data: timelineData,
    isLoading: isTimelineLoading,
    isFetching: isTimelineFetching,
  } = useContestTimelineQuery(contestAddress, contest);
  const isContestDataPending = isFetching && isPlaceholderData;
  const { viewModel } = useContestLobbyState(contest, { isContestDataPending });

  const eventShell = useMemo((): CompetitionEventShell | null => {
    if (contest?.event?.sportId) {
      return {
        id: contest.event.id,
        sportId: contest.event.sportId,
        externalId: contest.event.externalId,
        isActive: contest.event.isActive,
        metadata: contest.event.metadata,
      };
    }

    const navState = parseContestLobbyNavigationState(location.state);
    if (navState?.eventShell) return navState.eventShell;

    if (contestAddress) {
      const directoryContext = getDirectoryContextForContest(queryClient, contestAddress);
      if (directoryContext?.eventShell) return directoryContext.eventShell;
    }

    return null;
  }, [contest, location.state, contestAddress, queryClient]);

  const isTimelinePending = timelineData === undefined && (isTimelineLoading || isTimelineFetching);

  if (isLoading && !contest) {
    return <ContestLobbyLoadingShell eventShell={eventShell} />;
  }

  if (queryError && !contest) {
    const isNotFound = isApiError(queryError) && queryError.statusCode === 404;

    if (isNotFound) {
      return <ContestNotFound isAuthenticated={Boolean(user)} />;
    }

    return (
      <div className="flex min-h-[176px] flex-col items-center justify-center p-8 text-center">
        <p className="mb-2 text-lg font-medium text-gray-800">{queryError.message}</p>
      </div>
    );
  }

  if (!contest || !viewModel) {
    if (eventShell && isContestDataPending) {
      return <ContestLobbyLoadingShell eventShell={eventShell} />;
    }

    return <ContestNotFound isAuthenticated={Boolean(user)} />;
  }

  if (!contest.event?.sportId) {
    return (
      <div className="p-4">
        <ErrorMessage message="This contest's event data is unavailable." />
      </div>
    );
  }

  return (
    <ContestLobbyView
      contest={contest}
      viewModel={viewModel}
      currentUserId={user?.id}
      isAuthenticated={Boolean(user)}
      isContestDataPending={isContestDataPending}
      timelineData={timelineData}
      isTimelineLoading={isTimelinePending}
    />
  );
};
