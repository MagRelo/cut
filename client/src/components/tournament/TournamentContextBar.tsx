import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useActiveTournament } from "../../hooks/useTournamentData";
import { showTournamentContext } from "../../lib/tournamentContextRoutes";
import { useGlobalError } from "../../contexts/GlobalErrorContext";
import { resolveTournamentBeautyImage } from "../../types/tournament";
import { TournamentContextDetails } from "./TournamentContextDetails";

export const TournamentContextBar: React.FC = () => {
  const location = useLocation();
  const { tournament, isFetching, error: queryError } = useActiveTournament();
  const { showError, clearError } = useGlobalError();

  const visible = showTournamentContext(location.pathname);

  useEffect(() => {
    if (!visible) {
      clearError("tournament-header");
      return;
    }

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
  }, [visible, queryError, showError, clearError]);

  if (!visible) {
    return null;
  }

  if (isFetching && !tournament) {
    return (
      <div
        aria-hidden
        className="relative min-h-[5.5rem] overflow-hidden bg-gray-200 shadow-sm"
      />
    );
  }

  if (queryError || !tournament) {
    return null;
  }

  const headerImageUrl = resolveTournamentBeautyImage(tournament.beautyImage);

  return (
    <div className="relative overflow-hidden shadow-sm">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${headerImageUrl})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/50" aria-hidden />
      <div className="relative z-10 px-4 py-3">
        <TournamentContextDetails tournament={tournament} variant="overlay" />
      </div>
    </div>
  );
};
