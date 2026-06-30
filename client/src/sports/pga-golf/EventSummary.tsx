import React from "react";
import type { EventSummaryProps } from "@cut/sport-sdk/ui";
import { DEFAULT_TOURNAMENT_BEAUTY_IMAGE, resolveTournamentBeautyImage } from "./eventMedia";
import { parseGolfEventMetadata } from "./utils";
import { GolfEventDetails } from "./EventDetails";

export function resolveGolfEventHeroImage(event: EventSummaryProps["event"]): string {
  const meta = parseGolfEventMetadata(event.metadata);
  return resolveTournamentBeautyImage(meta.beautyImage ?? DEFAULT_TOURNAMENT_BEAUTY_IMAGE);
}

export const GolfEventSummary: React.FC<EventSummaryProps> = ({ event, surface = "hero" }) => {
  if (surface === "content") {
    return (
      <div className="px-4 py-3">
        <GolfEventDetails event={event} />
      </div>
    );
  }

  const headerImageUrl = resolveGolfEventHeroImage(event);

  return (
    <div className="relative overflow-hidden shadow-sm">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${headerImageUrl})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/50" aria-hidden />
      <div className="relative z-10 p-4">
        <GolfEventDetails event={event} />
      </div>
    </div>
  );
};
