import React from "react";
import type { CompetitionEventShell } from "@cut/sport-sdk/ui";
import {
  DEFAULT_TOURNAMENT_BEAUTY_IMAGE,
  resolveTournamentBeautyImage,
} from "./eventMedia";
import { parseGolfEventMetadata } from "./utils";
import { GolfEventDetails } from "./EventDetails";

interface GolfEventSummaryProps {
  event: CompetitionEventShell;
}

export const GolfEventSummary: React.FC<GolfEventSummaryProps> = ({ event }) => {
  const meta = parseGolfEventMetadata(event.metadata);
  const headerImageUrl = resolveTournamentBeautyImage(
    meta.beautyImage ?? DEFAULT_TOURNAMENT_BEAUTY_IMAGE,
  );

  return (
    <div className="relative overflow-hidden shadow-sm">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${headerImageUrl})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/50" aria-hidden />
      <div className="relative z-10 px-4 py-3">
        <GolfEventDetails event={event} />
      </div>
    </div>
  );
};
