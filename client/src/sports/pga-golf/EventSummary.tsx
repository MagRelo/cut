import React from "react";
import type { EventSummaryProps } from "@cut/sport-sdk/ui";
import { EventHeroPanel } from "../../components/platform/EventHeroPanel";
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
    <EventHeroPanel sportId={event.sportId} imageUrl={headerImageUrl} contentClassName="p-4">
      <GolfEventDetails event={event} />
    </EventHeroPanel>
  );
};
