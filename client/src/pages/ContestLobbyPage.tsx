import React, { useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { ContestLobbyView } from "../components/contest/lobby/ContestLobbyView";
import { ContestListConnectHint } from "../components/contest/ContestList";
import { ContestEventScopeProvider } from "../contexts/EventScopeContext";
import { useContestQuery } from "../hooks/useContestQuery";
import { useContestLobbyState } from "../hooks/useContestLobbyState";
import { useSportUIPlugin } from "../hooks/useSportUI";
import { isApiError } from "../utils/apiError";
import {
  getDirectoryContextForContest,
  parseContestLobbyNavigationState,
} from "../lib/contestNavigation";
import { eventDisplayNameFromMetadata, eventStartDateFromMetadata } from "../lib/eventMetadata";
import { ContestStatusBar } from "../components/contest/lobby/ContestStatusBar";

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

function ContestLobbyLoadingShell({ eventShell }: { eventShell: CompetitionEventShell }) {
  const plugin = useSportUIPlugin(eventShell.sportId);
  const EventSummary = plugin?.EventSummary;
  const eventName = eventDisplayNameFromMetadata(eventShell.metadata, "");
  const eventStartDate = eventStartDateFromMetadata(eventShell.metadata);

  return (
    <div>
      {EventSummary ? <EventSummary event={eventShell} /> : null}
      <div className="border-b border-gray-200">
        <div className="px-3 pb-2 pt-4">
          <div className="animate-pulse space-y-3 rounded-md border border-slate-200 bg-white p-4">
            <div className="h-5 w-2/3 rounded bg-slate-200" />
            <div className="h-4 w-1/2 rounded bg-slate-100" />
          </div>
        </div>
        <div className="mb-2">
          <ContestStatusBar
            contestStatus="OPEN"
            eventName={eventName}
            eventStartDate={eventStartDate}
          />
        </div>
        <div className="flex min-h-[120px] items-center justify-center p-4">
          <LoadingSpinner />
        </div>
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
  const { viewModel } = useContestLobbyState(contest);

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

  const awaitingFullContest = isFetching && (isPlaceholderData || !contest?.timeline);

  if (isLoading && !contest) {
    if (eventShell) {
      return <ContestLobbyLoadingShell eventShell={eventShell} />;
    }

    return (
      <div className="flex min-h-[176px] items-center justify-center p-4">
        <LoadingSpinner />
      </div>
    );
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
    if (eventShell && awaitingFullContest) {
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
    <ContestEventScopeProvider contest={contest}>
      <ContestLobbyView
        contest={contest}
        viewModel={viewModel}
        currentUserId={user?.id}
        isAuthenticated={Boolean(user)}
      />
    </ContestEventScopeProvider>
  );
};
