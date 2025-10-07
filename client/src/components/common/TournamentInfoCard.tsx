import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LoadingSpinner } from "./LoadingSpinner";
import { ErrorMessage } from "../util/ErrorMessage";
import { useTournament } from "../../contexts/TournamentContext";
import { CountdownTimer } from "./CountdownTimer";
import { TournamentSummaryModal } from "./TournamentSummaryModal";

export const TournamentInfoCard: React.FC = () => {
  const { currentTournament, isLoading, error } = useTournament();
  const location = useLocation();
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="relative overflow-hidden md:rounded-lg p-4 min-h-[176px] flex items-center justify-center border-b border-gray-300">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative overflow-hidden md:rounded-lg p-4 min-h-[176px] border-b border-gray-300">
        <ErrorMessage message={error.message} />
      </div>
    );
  }

  if (!currentTournament) {
    return null;
  }

  return (
    <>
      <div className="relative overflow-hidden md:rounded-lg min-h-[176px] border-b border-gray-300">
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
            <h1
              onClick={() => setIsSummaryModalOpen(true)}
              className="mt-1 text-3xl font-bold tracking-tight text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]"
            >
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
                Starting: <CountdownTimer targetDate={currentTournament.endDate} />
              </p>
            ) : (
              <p className="text-sm font-medium tracking-wide">
                {currentTournament.roundDisplay} - {currentTournament.roundStatusDisplay}
              </p>
            )}
          </div>

          {/* links to team and leagues */}
          <div className="mt-5">
            <div className="flex flex-row items-center justify-between">
              {/* nav links */}
              <div className="flex items-center gap-2 md:gap-4">
                <Link
                  to="/contests"
                  className={`flex-1 md:flex-none inline-block text-white/90 hover:text-white text-sm font-medium border-2 ${
                    location.pathname === "/contests"
                      ? "border-white bg-white/20"
                      : "border-white/50"
                  } rounded px-3 py-1 transition-colors flex items-center justify-center`}
                >
                  Contests
                </Link>
                <Link
                  to="/lineups"
                  className={`flex-1 md:flex-none inline-block text-white/90 hover:text-white text-sm font-medium border-2 ${
                    location.pathname === "/lineups"
                      ? "border-white bg-white/20"
                      : "border-white/50"
                  } rounded px-3 py-1 transition-colors flex items-center justify-center`}
                >
                  Lineups
                </Link>
                <Link
                  to="/leaderboard"
                  className={`flex-1 md:flex-none inline-block text-white/90 hover:text-white text-sm font-medium border-2 ${
                    location.pathname === "/leaderboard"
                      ? "border-white bg-white/20"
                      : "border-white/50"
                  } rounded px-3 py-1 transition-colors flex items-center justify-center`}
                >
                  Leaderboards
                </Link>
              </div>

              {/* account */}
              <Link
                to="/account"
                className={`inline-block text-white/90 hover:text-white text-sm font-medium border-2 ${
                  location.pathname === "/account" ? "border-white bg-white/20" : "border-white/50"
                } rounded-full transition-colors flex items-center justify-center`}
                style={{ width: "31px", height: "31px" }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Summary Modal */}
      <TournamentSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
      />
    </>
  );
};
