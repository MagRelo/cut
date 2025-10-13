import React, { useState } from "react";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ErrorMessage } from "../common/ErrorMessage";
import { useTournament } from "../../contexts/TournamentContext";
import { CountdownTimer } from "./CountdownTimer";
import { TournamentSummaryModal } from "./TournamentSummaryModal";
import { Navigation } from "../common/Navigation";

export const TournamentInfoCard: React.FC = () => {
  const { currentTournament, isLoading, error } = useTournament();
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="relative overflow-hidden md:rounded-lg p-4 min-h-[176px] flex items-center justify-center border-b border-gray-300 bg-slate-700">
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
            <Navigation />
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
