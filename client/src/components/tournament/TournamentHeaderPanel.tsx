import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTournamentMetadata } from "../../hooks/useTournamentData";
import { resolveTournamentBeautyImage } from "../../types/tournament";
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

  if (isFetching && !currentTournament) {
    return <div className="overflow-hidden min-h-[162px]" />;
  }

  if (queryError) {
    return <div className="overflow-hidden min-h-[162px]" />;
  }

  if (!currentTournament) {
    return null;
  }

  const headerImageUrl = resolveTournamentBeautyImage(currentTournament.beautyImage);
  const locationLine = [currentTournament.city?.trim(), currentTournament.state?.trim()]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="relative overflow-hidden min-h-[162px]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${headerImageUrl})`,
        }}
      />
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 flex flex-col min-h-[162px] text-white">
        <div className="px-4 pt-4">
          {/* Title → course (emphasis) → location (muted tertiary); all Outfit via headings + font-display */}
          <div className="flex justify-between items-center mt-1">
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">
              <Link
                to="/leaderboard"
                className="hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-sm"
              >
                {currentTournament.name}
              </Link>
            </h1>
          </div>

          {currentTournament.course ? (
            <h2 className="mt-1.5 font-display text-lg font-medium leading-snug text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">
              {currentTournament.course}
            </h2>
          ) : null}

          {locationLine ? (
            <p className="mt-1 font-display text-sm font-normal leading-snug tracking-wide text-white/95 [text-shadow:_0_1px_1px_rgb(0_0_0_/_35%)]">
              {locationLine}
            </p>
          ) : null}
        </div>

        {/* Tab strip: page-colored tabs; gaps + flex spacer let the header image show through */}
        <div className="mt-auto pt-2 px-4 pb-0">
          <Navigation />
        </div>
      </div>
    </div>
  );
};
