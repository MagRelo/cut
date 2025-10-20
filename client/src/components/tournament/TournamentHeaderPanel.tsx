import React from "react";
import { ErrorMessage } from "../common/ErrorMessage";
import { useTournamentMetadata } from "../../hooks/useTournamentData";
import { CountdownTimer } from "./CountdownTimer";
import { Navigation } from "../common/Navigation";

export const TournamentHeaderPanel: React.FC = () => {
  // Use lightweight metadata endpoint instead of full tournament data
  // This loads ~10x faster since it doesn't fetch all players and contests
  const { data, isLoading, error } = useTournamentMetadata();
  const currentTournament = data?.tournament;

  if (isLoading) {
    return (
      <div className="relative overflow-hidden min-h-[176px] border-b border-gray-300 bg-slate-700 animate-pulse">
        <div className="relative p-4">
          {/* Tournament name skeleton */}
          <div className="h-9 bg-gray-600 rounded w-3/4 mb-2"></div>
          {/* Course skeleton */}
          <div className="h-6 bg-gray-600 rounded w-1/2 mb-2"></div>
          {/* Status skeleton */}
          <div className="h-5 bg-gray-600 rounded w-1/3 mb-5"></div>
          {/* Navigation skeleton */}
          <div className="flex gap-2">
            <div className="h-10 bg-gray-600 rounded w-24"></div>
            <div className="h-10 bg-gray-600 rounded w-24"></div>
            <div className="h-10 bg-gray-600 rounded w-24"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative overflow-hidden p-4 min-h-[176px] border-b border-gray-300">
        <ErrorMessage message={error.message} />
      </div>
    );
  }

  if (!currentTournament) {
    return null;
  }

  return (
    <>
      <div className="relative overflow-hidden min-h-[176px] border-b border-gray-300">
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
        <div className="relative p-4 text-white">
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
          <div className="text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">
            {currentTournament.status === "NOT_STARTED" ? (
              <p className="text-sm font-medium tracking-wide">
                Starting: <CountdownTimer targetDate={currentTournament.startDate} />
              </p>
            ) : (
              <p className="text-sm font-medium tracking-wide">
                {currentTournament.roundDisplay} - {currentTournament.roundStatusDisplay}
              </p>
            )}
          </div>

          {/* links to team and leagues */}
          <div className="mt-5">
            <Navigation />
          </div>
        </div>
      </div>
    </>
  );
};
