import React, { useEffect } from "react";
import { useTournamentMetadata } from "../../hooks/useTournamentData";
import { CountdownTimer } from "./CountdownTimer";
import { Navigation } from "../common/Navigation";

import { useGlobalError } from "../../contexts/GlobalErrorContext";

export const TournamentHeaderPanel: React.FC = () => {
  // Use lightweight metadata endpoint instead of full tournament data
  // This loads ~10x faster since it doesn't fetch all players and contests
  const { data, isFetching, error: queryError } = useTournamentMetadata();
  const { showError, clearError } = useGlobalError();

  useEffect(() => {
    if (queryError) {
      showError({
        id: "tournament-header",
        title: "Something is wrong...",
        message: "Failed to load tournament data.",
        retryLabel: "Try Again",
        onRetry: () => window.location.reload(),
      });
    } else {
      clearError("tournament-header");
    }
  }, [queryError, showError, clearError]);
  const currentTournament = data?.tournament;

  // Only show loading on initial load (no data yet)
  // This prevents getting stuck in loading state when refetching
  if (isFetching && !currentTournament) {
    return (
      <div className="overflow-hidden min-h-[176px] border-b border-gray-300 bg-slate-700 animate-pulse">
        <div className="p-4">
          {/* Tournament name skeleton */}
          <div className="h-9 bg-gray-600 rounded w-3/4 mb-2"></div>
          {/* Course skeleton */}
          <div className="h-6 bg-gray-600 rounded w-1/2 mb-2"></div>
          {/* Status skeleton */}
          <div className="h-5 bg-gray-600 rounded w-1/3 mb-5"></div>

          {/* Navigation skeleton */}
          <div className="mt-4 flex flex-row items-center justify-between">
            {/* nav links skeleton */}
            <div className="flex items-center gap-4">
              <div className="h-8 w-16 bg-gray-300/70 rounded" />
              <div className="h-8 w-20 bg-gray-300/70 rounded" />
            </div>

            {/* account + icon skeleton */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gray-300/70 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (queryError) {
    return <div className="overflow-hidden min-h-[176px]" />;
  }

  if (!currentTournament) {
    return null;
  }

  return (
    <div className="relative overflow-hidden min-h-[176px] border-b border-gray-300">
      {/* Subtle loading indicator when refetching in background */}
      {isFetching && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 animate-pulse z-50"></div>
      )}
      {currentTournament.beautyImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${currentTournament.beautyImage})`,
            }}
          />
          <div className="absolute inset-0 bg-black/50" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-700" />
      )}
      <div className="relative z-10 p-4 text-white">
        {/* tournament name */}
        <div className="flex justify-between items-center mt-1">
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">
            {currentTournament.name}
          </h1>
        </div>

        {/* course */}
        {currentTournament.course && (
          <h2 className="text-lg font-medium text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">
            {currentTournament.course}
          </h2>
        )}

        {/* round display */}
        <div className="text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)] mt-1">
          {currentTournament.status === "NOT_STARTED" ? (
            <p className="text-sm font-medium tracking-wide font-display">
              Starting: <CountdownTimer targetDate={currentTournament.startDate} />
            </p>
          ) : (
            <p className="text-sm font-medium tracking-wide">
              {currentTournament.roundDisplay} - {currentTournament.roundStatusDisplay}
            </p>
          )}
        </div>

        {/* main navigation */}
        <div className="mt-4 px-0">
          <Navigation />
        </div>
      </div>
    </div>
  );
};
